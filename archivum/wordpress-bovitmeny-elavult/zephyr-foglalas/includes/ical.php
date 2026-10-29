<?php
if (!defined('ABSPATH')) exit;

/* ---------- iCal (ICS) feldolgozás ---------- */
function zf_ical_unfold($text) {
    $text = str_replace(["\r\n", "\r"], "\n", (string) $text);
    return preg_replace("/\n[ \t]/", '', $text);
}
function zf_ical_unescape($v) { return str_replace(['\\n', '\\N', '\\,', '\\;', '\\\\'], ["\n", "\n", ',', ';', '\\'], $v); }
/* ICS dátum → Y-m-d (egész napos vagy időpontos) */
function zf_ical_date($val) {
    if (preg_match('/^(\d{4})(\d{2})(\d{2})/', trim($val), $m)) return "$m[1]-$m[2]-$m[3]";
    return '';
}
/* Események listája: [uid, start, end, summary] (end = távozás napja, kizárólagos) */
function zf_ical_parse($text) {
    $lines = explode("\n", zf_ical_unfold($text));
    $events = []; $cur = null;
    foreach ($lines as $ln) {
        $ln = rtrim($ln);
        if ($ln === 'BEGIN:VEVENT') { $cur = ['uid' => '', 'start' => '', 'end' => '', 'summary' => '', 'status' => '']; continue; }
        if ($ln === 'END:VEVENT') {
            if ($cur && $cur['start']) {
                if (!$cur['end'] || $cur['end'] <= $cur['start']) $cur['end'] = zf_add_days($cur['start'], 1);
                if (!$cur['uid']) $cur['uid'] = md5($cur['start'] . $cur['end'] . $cur['summary']);
                if (strtoupper($cur['status']) !== 'CANCELLED') $events[] = $cur;
            }
            $cur = null; continue;
        }
        if ($cur === null) continue;
        $p = strpos($ln, ':'); if ($p === false) continue;
        $name = strtoupper(strtok(substr($ln, 0, $p), ';')); $val = substr($ln, $p + 1);
        if ($name === 'UID') $cur['uid'] = substr($val, 0, 250);
        elseif ($name === 'DTSTART') $cur['start'] = zf_ical_date($val);
        elseif ($name === 'DTEND') $cur['end'] = zf_ical_date($val);
        elseif ($name === 'SUMMARY') $cur['summary'] = substr(zf_ical_unescape($val), 0, 250);
        elseif ($name === 'STATUS') $cur['status'] = $val;
    }
    return $events;
}

/* Egy apartman egy külső naptárának behúzása */
function zf_sync_feed($apt, $source, $url) {
    global $wpdb;
    $t = zf_t('bookings');
    $res = wp_remote_get($url, ['timeout' => 20, 'redirection' => 5, 'user-agent' => 'ZephyrFoglalas/' . ZF_VER]);
    if (is_wp_error($res)) return ['ok' => false, 'msg' => $res->get_error_message()];
    $code = wp_remote_retrieve_response_code($res); $body = wp_remote_retrieve_body($res);
    if ($code !== 200 || strpos($body, 'BEGIN:VCALENDAR') === false) return ['ok' => false, 'msg' => 'Hibás válasz (HTTP ' . $code . ')'];
    $events = zf_ical_parse($body);
    $today = zf_today(); $seen = []; $added = 0; $updated = 0; $conflicts = 0;
    foreach ($events as $e) {
        if ($e['end'] < $today) continue;
        $uid = $source . ':' . $e['uid']; $seen[] = $uid;
        $ex = $wpdb->get_row($wpdb->prepare("SELECT * FROM $t WHERE apt=%s AND source=%s AND ext_uid=%s LIMIT 1", $apt, $source, $uid), ARRAY_A);
        if ($ex) {
            if ($ex['checkin'] !== $e['start'] || $ex['checkout'] !== $e['end'] || $ex['ext_summary'] !== $e['summary'] || $ex['status'] !== 'external') {
                zf_update_booking($ex['id'], ['checkin' => $e['start'], 'checkout' => $e['end'], 'ext_summary' => $e['summary'], 'status' => 'external']); $updated++;
            }
        } else {
            /* ütközés jelzése (pl. egyszerre foglaltak két felületen) */
            foreach (zf_bookings_overlapping($apt, $e['start'], $e['end'], ['pending', 'confirmed']) as $c) { $conflicts++; zf_mail_conflict($c, $source, $e); }
            zf_insert_booking(['apt' => $apt, 'checkin' => $e['start'], 'checkout' => $e['end'], 'status' => 'external', 'source' => $source, 'ext_uid' => $uid, 'ext_summary' => $e['summary'], 'nights' => zf_diff_days($e['start'], $e['end'])]);
            $added++;
        }
    }
    /* a külső naptárból eltűnt (lemondott) jövőbeli események törlése */
    $rows = $wpdb->get_results($wpdb->prepare("SELECT id, ext_uid FROM $t WHERE apt=%s AND source=%s AND status='external' AND checkout>=%s", $apt, $source, $today), ARRAY_A);
    $removed = 0;
    foreach ($rows as $r) if (!in_array($r['ext_uid'], $seen, true)) { $wpdb->delete($t, ['id' => (int) $r['id']]); $removed++; }
    return ['ok' => true, 'msg' => sprintf('%d esemény · +%d új · %d módosult · %d törölve%s', count($events), $added, $updated, $removed, $conflicts ? ' · ' . $conflicts . ' ÜTKÖZÉS!' : '')];
}
function zf_sync_all() {
    $s = zf_settings(); $log = [];
    foreach ($s['apartments'] as $apt => $a) {
        foreach (($a['ical'] ?? []) as $src => $url) {
            $url = trim((string) $url); if (!$url) continue;
            $r = zf_sync_feed($apt, $src, $url);
            $log[$apt . '|' . $src] = ['time' => current_time('mysql'), 'ok' => $r['ok'], 'msg' => $r['msg']];
        }
    }
    $s = zf_settings(); $s['sync'] = $log; zf_save_settings($s);
    return $log;
}

/* ---------- iCal export ---------- */
function zf_ical_escape($v) { return str_replace(['\\', ';', ',', "\r\n", "\n"], ['\\\\', '\\;', '\\,', '\\n', '\\n'], (string) $v); }
function zf_ical_fold($line) {
    $out = ''; $cur = '';
    foreach (preg_split('//u', $line, -1, PREG_SPLIT_NO_EMPTY) as $ch) {
        if (strlen($cur . $ch) > 74) { $out .= $cur . "\r\n "; $cur = ''; }
        $cur .= $ch;
    }
    return $out . $cur . "\r\n";
}
/* $for: annak a platformnak a neve, amely a naptárat kéri (a saját eseményeit nem küldjük vissza)
   $detail: Google Naptárhoz – névvel, állapottal, összeggel */
function zf_ical_export($apt, $for = '', $detail = false) {
    global $wpdb;
    $s = zf_settings(); $host = wp_parse_url(home_url(), PHP_URL_HOST) ?: 'zephyr';
    $from = zf_add_days(zf_today(), -60);
    $where = $apt === 'all' ? '1=1' : $wpdb->prepare('apt=%s', $apt);
    $rows = $wpdb->get_results($wpdb->prepare('SELECT * FROM ' . zf_t('bookings') . " WHERE $where AND checkout>=%s AND status IN ('pending','confirmed','blocked','external') ORDER BY checkin", $from), ARRAY_A);
    $o = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Zephyr Apartmanhaz//Foglalas " . ZF_VER . "//HU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n";
    $name = $apt === 'all' ? 'Zephyr – összes foglalás' : 'Zephyr ' . ($s['apartments'][$apt]['name'] ?? $apt);
    $o .= zf_ical_fold('X-WR-CALNAME:' . zf_ical_escape($name)) . "X-WR-TIMEZONE:Europe/Budapest\r\n";
    $stamp = gmdate('Ymd\THis\Z');
    foreach ($rows as $b) {
        if ($for && $b['source'] === $for) continue;
        $an = $s['apartments'][$b['apt']]['name'] ?? $b['apt'];
        if ($detail) {
            $who = $b['status'] === 'blocked' ? 'Lezárva' : ($b['status'] === 'external' ? zf_source_label($b['source']) . ($b['ext_summary'] ? ' – ' . $b['ext_summary'] : '') : $b['name']);
            $sum = ($apt === 'all' ? $an . ': ' : '') . $who . ($b['status'] === 'pending' ? ' (jóváhagyásra vár)' : '');
            $desc = $b['status'] === 'external' || $b['status'] === 'blocked' ? (string) $b['admin_note'] :
                "Telefon: {$b['phone']}\nE-mail: {$b['email']}\nVendégek: {$b['adults']} felnőtt, {$b['children']} gyermek\nVégösszeg: " . zf_money($b['grand_total']) . "\nElőleg: " . zf_money($b['deposit']) . ($b['admin_note'] ? "\nMegjegyzés: {$b['admin_note']}" : '');
        } else { $sum = 'Foglalt – Zephyr'; $desc = ''; }
        $o .= "BEGIN:VEVENT\r\n";
        $o .= 'UID:zf-' . (int) $b['id'] . '@' . $host . "\r\nDTSTAMP:$stamp\r\n";
        $o .= 'DTSTART;VALUE=DATE:' . str_replace('-', '', $b['checkin']) . "\r\n";
        $o .= 'DTEND;VALUE=DATE:' . str_replace('-', '', $b['checkout']) . "\r\n";
        $o .= zf_ical_fold('SUMMARY:' . zf_ical_escape($sum));
        if ($desc) $o .= zf_ical_fold('DESCRIPTION:' . zf_ical_escape($desc));
        $o .= "TRANSP:OPAQUE\r\nEND:VEVENT\r\n";
    }
    return $o . "END:VCALENDAR\r\n";
}
function zf_ical_url($apt, $for = '', $detail = false) {
    $s = zf_settings();
    $args = ['key' => $s['ical_key']];
    if ($for) $args['for'] = $for;
    if ($detail) $args['reszletes'] = 1;
    return add_query_arg($args, rest_url('zephyr/v1/ical/' . $apt));
}
