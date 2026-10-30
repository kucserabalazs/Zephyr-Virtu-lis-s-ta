<?php
/*
 * Zephyr Apartmanház – foglalási rendszer (önálló, WordPress nélkül)
 * Hely: virtualis-seta/api/index.php   ·   Adatok: virtualis-seta/api/data/
 * PHP 7.4+ kell hozzá. Adatbázis nem kell: minden egy védett fájlban tárolódik.
 *
 * Végpontok (?r=…):
 *   vendég:  config · availability (apt, from, to) · book (POST)
 *   admin:   login · logout · me · bookings · action · manual · settings · save_settings · password
 *   admin app (admin/): waste · waste_save · remind_test   ·   naptár: teendok_ical (key) – hulladék + vendégérkezés emlékeztetővel
 */

date_default_timezone_set('Europe/Budapest');
mb_internal_encoding('UTF-8');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

/* Az első belépési jelszó (kivonat). Belépés után a foglalási ablak admin részében megváltoztatható. */
const ZB_INITIAL_HASH = '$2y$10$AW.XpFaNg0RNYNMz/mwQaOpUvoujNL7zj9FYQK7yEcRRuJG/YY8Bq';
const ZB_DATA_DIR = __DIR__ . '/data';
const ZB_DB = ZB_DATA_DIR . '/db.php';
const ZB_BLOCKING = array('pending', 'approved', 'paid', 'block');

/* ---------------------------------------------------------------- válasz */
function out($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail($msg, $code = 400) { out(array('message' => $msg), $code); }

/* ---------------------------------------------------------------- tárolás */
function defaults() {
    return array(
        'apartments' => array(
            array('id' => 'korvett',  'name' => 'Korvett',  'no' => 1, 'cap' => 4, 'price' => 30000, 'color' => '#e2483d', 'active' => 1),
            array('id' => 'dingi',    'name' => 'Dingi',    'no' => 2, 'cap' => 2, 'price' => 22000, 'color' => '#3fb37f', 'active' => 1),
            array('id' => 'fregatt',  'name' => 'Fregatt',  'no' => 3, 'cap' => 4, 'price' => 30000, 'color' => '#3d8fe2', 'active' => 1),
            array('id' => 'kaloz',    'name' => 'Kalóz',    'no' => 4, 'cap' => 2, 'price' => 22000, 'color' => '#9b6be2', 'active' => 1),
            array('id' => 'schooner', 'name' => 'Schooner', 'no' => 5, 'cap' => 4, 'price' => 32000, 'color' => '#2bb3c0', 'active' => 1),
        ),
        'tax' => 600, 'deposit_pct' => 30, 'min_nights' => 2, 'max_nights' => 30, 'lead_days' => 1, 'horizon_days' => 400,
        'season_from' => '05-15', 'season_to' => '10-15', 'weekend_pct' => 0,
        'checkin' => '14:00', 'checkout' => '10:00',
        'phone' => '+36 20 536 3120', 'email' => 'kucserabalazs79@gmail.com', 'notify_email' => 'kucserabalazs79@gmail.com',
        'address' => '8621 Zamárdi, Gáspár András utca 58.',
        'bank_holder' => '', 'bank_name' => '', 'bank_account' => '',
        'bank_iban' => '', 'bank_swift' => '', 'bank_address' => '',
        'szep_otp' => 'SZK/2022/002754', 'szep_mbh' => 'S14598', 'szep_kh' => '84059114',
        'ntak' => 'MA22033593 / MA22033128',
        'seasons' => array(), 'ext_ignored' => array(),
        'pending_days' => 3, 'pay_days' => 5, 'rules_url' => '', 'privacy_url' => '',
        'price_rules' => array(), 'prices_checked' => 0,
        'ical' => array(), 'ical_key' => '', 'sync_log' => array(), 'last_sync' => 0,
        /* emlékeztetők (admin app): hulladék előző nap, vendégérkezés egy nappal vagy egy héttel előre */
        'remind_hour' => 18, 'remind_waste' => 1, 'guest_mode' => 'day', 'week_day' => 0, 'remind_email' => '',
    );
}

function default_seasons($s) {
    $list = array(array('Előszezon', '05-15', '06-18'), array('Június vége', '06-19', '06-30'), array('Főszezon', '07-01', '08-22'),
        array('Augusztus vége', '08-23', '08-31'), array('Szeptember', '09-01', '09-19'), array('Utószezon', '09-20', '10-15'));
    $o = array();
    foreach ($list as $x) {
        $pr = array(); foreach ($s['apartments'] as $a) { $pr[$a['id']] = (int) $a['price']; }
        $o[] = array('name' => $x[0], 'from' => $x[1], 'to' => $x[2], 'prices' => $pr);
    }
    return $o;
}
function md_in($md, $f, $t) { return $f <= $t ? ($md >= $f && $md <= $t) : ($md >= $f || $md <= $t); }
function is_ext($b) { return !empty($b['ext_uid']) && !empty($b['source']) && isset(ical_sources()[$b['source']]); }

$ZB_LOCK = null;
function db_lock() {
    global $ZB_LOCK;
    if (!is_dir(ZB_DATA_DIR)) { @mkdir(ZB_DATA_DIR, 0750, true); }
    if (!file_exists(ZB_DATA_DIR . '/.htaccess')) {
        @file_put_contents(ZB_DATA_DIR . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
        @file_put_contents(ZB_DATA_DIR . '/index.html', '');
    }
    $ZB_LOCK = fopen(ZB_DATA_DIR . '/db.lock', 'c');
    if (!$ZB_LOCK || !flock($ZB_LOCK, LOCK_EX)) { fail('A foglalási rendszer most nem érhető el (tárhely).', 503); }
}
function db_load() {
    db_lock();
    $db = null;
    if (file_exists(ZB_DB)) {
        $raw = file_get_contents(ZB_DB);
        $p = strpos($raw, "\n");
        $db = json_decode($p === false ? '' : substr($raw, $p + 1), true);
    }
    if (!is_array($db)) {
        $db = array('settings' => array(), 'bookings' => array(), 'tokens' => array(), 'pass' => ZB_INITIAL_HASH, 'seq' => 0, 'rl' => array());
    }
    $db['settings'] = array_merge(defaults(), is_array($db['settings']) ? $db['settings'] : array());
    foreach (array('bookings', 'tokens', 'rl') as $k) { if (!isset($db[$k]) || !is_array($db[$k])) { $db[$k] = array(); } }
    if (empty($db['settings']['ical_key'])) { $db['settings']['ical_key'] = bin2hex(random_bytes(12)); }
    if (!is_array($db['settings']['ical'])) { $db['settings']['ical'] = array(); }
    if (!is_array($db['settings']['ext_ignored'])) { $db['settings']['ext_ignored'] = array(); }
    if (empty($db['settings']['mig_otp'])) {   /* egyszeri: OTP SZÉP szerződésszám beírása, ha még üres */
        if (empty($db['settings']['szep_otp'])) { $db['settings']['szep_otp'] = 'SZK/2022/002754'; }
        $db['settings']['mig_otp'] = 1;
    }
    if (empty($db['settings']['seasons']) || !is_array($db['settings']['seasons'])) {   /* első indítás: szezonok az eddigi alapárral */
        $db['settings']['seasons'] = default_seasons($db['settings']);
        $db['settings']['prices_checked'] = 0;
    }
    return $db;
}
function db_save($db) {
    $json = json_encode($db, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) { fail('Mentési hiba.', 500); }
    $tmp = ZB_DB . '.tmp';
    /* Az első sor miatt a fájl böngészőből megnyitva sem mutat semmit. */
    if (file_put_contents($tmp, "<?php http_response_code(404); exit; ?>\n" . $json) === false || !rename($tmp, ZB_DB)) {
        fail('A foglalást nem sikerült elmenteni (a szerveren nincs írási jog vagy elfogyott a tárhely).', 500);
    }
    /* napi biztonsági másolat, 14 napig */
    $bk = ZB_DATA_DIR . '/backup-' . date('Y-m-d') . '.php';
    if (!file_exists($bk)) {
        @copy(ZB_DB, $bk);
        foreach ((array) glob(ZB_DATA_DIR . '/backup-*.php') as $f) { if (filemtime($f) < time() - 14 * 86400) { @unlink($f); } }
    }
}

/* ---------------------------------------------------------------- dátumok */
function today() { return date('Y-m-d'); }
function add_days($ymd, $n) { $d = new DateTime($ymd . ' 12:00'); $d->modify(($n >= 0 ? '+' : '') . (int) $n . ' day'); return $d->format('Y-m-d'); }
function nights($a, $b) { return (int) round((strtotime($b . ' 12:00') - strtotime($a . ' 12:00')) / 86400); }
function valid_date($s) {
    if (!is_string($s) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) { return false; }
    list($y, $m, $d) = array_map('intval', explode('-', $s));
    return checkdate($m, $d, $y);
}
function weekday($ymd) { return (int) date('w', strtotime($ymd . ' 12:00')); }
function hu_date($ymd) {
    $m = array('január','február','március','április','május','június','július','augusztus','szeptember','október','november','december');
    if (!valid_date($ymd)) { return $ymd; }
    list($y, $mo, $d) = array_map('intval', explode('-', $ymd));
    return $y . '. ' . $m[$mo - 1] . ' ' . $d . '.';
}
function money($n) { return number_format((float) $n, 0, ',', ' ') . ' Ft'; }

/* ---------------------------------------------------------------- üzleti logika */
function apartments($s, $active = false) {
    $o = array();
    foreach ($s['apartments'] as $a) { if ($active && empty($a['active'])) { continue; } $o[$a['id']] = $a; }
    return $o;
}
function in_season($s, $ymd) {
    $f = $s['season_from']; $t = $s['season_to'];
    if (!$f || !$t) { return true; }
    $md = substr($ymd, 5);
    return $f <= $t ? ($md >= $f && $md <= $t) : ($md >= $f || $md <= $t);
}
function price_for($s, $apt, $ymd) {
    $aps = apartments($s);
    if (!isset($aps[$apt])) { return 0; }
    $p = (int) $aps[$apt]['price'];
    $md = substr($ymd, 5);
    foreach ((array) $s['seasons'] as $se) {   /* szezonális alapár */
        if (!empty($se['from']) && !empty($se['to']) && md_in($md, $se['from'], $se['to']) && !empty($se['prices'][$apt])) { $p = (int) $se['prices'][$apt]; }
    }
    foreach ((array) $s['price_rules'] as $r) {
        if (empty($r['from']) || empty($r['to']) || empty($r['price'])) { continue; }
        if ($r['apt'] !== 'all' && $r['apt'] !== $apt) { continue; }
        if ($ymd >= $r['from'] && $ymd <= $r['to']) { $p = (int) $r['price']; }
    }
    $w = weekday($ymd);
    if (!empty($s['weekend_pct']) && ($w === 5 || $w === 6)) { $p = (int) (round($p * (1 + $s['weekend_pct'] / 100) / 500) * 500); }
    return $p;
}
function eff_status($s, $b) {
    if ($b['status'] === 'pending' && time() - (int) $b['created'] > max(1, (int) $s['pending_days']) * 86400) { return 'expired'; }
    return $b['status'];
}
function busy_map($db, $apt, $from, $to, $exclude = '') {
    $map = array();
    foreach ($db['bookings'] as $b) {
        if ($b['apt'] !== $apt || $b['id'] === $exclude) { continue; }
        if (!in_array(eff_status($db['settings'], $b), ZB_BLOCKING, true)) { continue; }
        if (!($b['checkin'] < $to && $b['checkout'] > $from)) { continue; }
        for ($d = $b['checkin']; $d < $b['checkout']; $d = add_days($d, 1)) { $map[$d] = $b; }
    }
    return $map;
}
function day_free($s, $d, $busy) {
    if (isset($busy[$d]) || !in_season($s, $d)) { return false; }
    if ($d < add_days(today(), (int) $s['lead_days'])) { return false; }
    if ($d > add_days(today(), (int) $s['horizon_days'])) { return false; }
    return true;
}
function quote($s, $apt, $ci, $co, $adults, $disc_pct = 0) {
    $sum = 0;
    for ($d = $ci; $d < $co; $d = add_days($d, 1)) { $sum += price_for($s, $apt, $d); }
    $n = nights($ci, $co);
    $disc = $disc_pct > 0 ? (int) (round($sum * $disc_pct / 100 / 100) * 100) : 0;   /* stégjáték-kedvezmény: csak a szállásdíjból, az adót nem érinti */
    $tax = (int) $adults * $n * (int) $s['tax'];
    $total = $sum - $disc + $tax;
    return array('total' => $total, 'tax' => $tax, 'discount' => $disc, 'deposit' => (int) (round($total * (int) $s['deposit_pct'] / 100 / 100) * 100));
}
function find_idx($db, $id) { foreach ($db['bookings'] as $i => $b) { if ($b['id'] === $id) { return $i; } } return -1; }
function new_ref($prefix) { return $prefix . '-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4)); }
function set_status(&$b, $st, $txt = '', $who = 'tulajdonos') { $b['status'] = $st; $b['log'][] = array('t' => time(), 's' => $st, 'u' => $who, 'x' => $txt); }
function client_ip() { return isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : ''; }
function clean($v, $max = 200) { $v = trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string) $v)); return mb_substr($v, 0, $max); }
function clean_ml($v, $max = 1000) { $v = trim(preg_replace('/[\x00-\x09\x0B-\x1F\x7F]+/u', ' ', str_replace("\r", '', (string) $v))); return mb_substr($v, 0, $max); }


/* ---------------------------------------------------------------- iCal naptárszinkron (Airbnb, Szállás.hu, Google Naptár) */
function ical_sources() { return array('airbnb' => 'Airbnb', 'szallas' => 'Szállás.hu', 'egyeb' => 'Egyéb naptár'); }
function ical_date($v) { return preg_match('/^(\d{4})(\d{2})(\d{2})/', trim($v), $m) ? "$m[1]-$m[2]-$m[3]" : ''; }
function ical_parse($text) {
    $text = preg_replace("/\r?\n[ \t]/", '', str_replace("\r\n", "\n", (string) $text));
    $ev = array(); $cur = null;
    foreach (explode("\n", $text) as $ln) {
        $ln = rtrim($ln);
        if ($ln === 'BEGIN:VEVENT') { $cur = array('uid' => '', 'start' => '', 'end' => '', 'summary' => '', 'status' => ''); continue; }
        if ($ln === 'END:VEVENT') {
            if ($cur && $cur['start']) {
                if (!$cur['end'] || $cur['end'] <= $cur['start']) { $cur['end'] = add_days($cur['start'], 1); }
                if (!$cur['uid']) { $cur['uid'] = md5($cur['start'] . $cur['end'] . $cur['summary']); }
                if (strtoupper($cur['status']) !== 'CANCELLED') { $ev[] = $cur; }
            }
            $cur = null; continue;
        }
        if ($cur === null || ($p = strpos($ln, ':')) === false) { continue; }
        $name = strtoupper(strtok(substr($ln, 0, $p), ';')); $val = substr($ln, $p + 1);
        if ($name === 'UID') { $cur['uid'] = substr($val, 0, 200); }
        elseif ($name === 'DTSTART') { $cur['start'] = ical_date($val); }
        elseif ($name === 'DTEND') { $cur['end'] = ical_date($val); }
        elseif ($name === 'SUMMARY') { $cur['summary'] = mb_substr(str_replace(array('\\,', '\;', '\\n'), array(',', ';', ' '), $val), 0, 120); }
        elseif ($name === 'STATUS') { $cur['status'] = $val; }
    }
    return $ev;
}
function http_get($url) {
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 4, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_TIMEOUT => 12, CURLOPT_USERAGENT => 'ZephyrFoglalas/1.0'));
        $body = curl_exec($c); $code = (int) curl_getinfo($c, CURLINFO_HTTP_CODE); $err = curl_error($c); curl_close($c);
        return array($code, $body === false ? '' : $body, $err);
    }
    $ctx = stream_context_create(array('http' => array('timeout' => 12, 'user_agent' => 'ZephyrFoglalas/1.0'), 'ssl' => array('verify_peer' => true)));
    $body = @file_get_contents($url, false, $ctx);
    return array($body === false ? 0 : 200, $body === false ? '' : $body, $body === false ? 'letöltési hiba' : '');
}
function sync_feed(&$db, $apt, $src, $url) {
    list($code, $body, $err) = http_get($url);
    if ($code !== 200 || strpos($body, 'BEGIN:VCALENDAR') === false) { return array('ok' => false, 'msg' => $err ? $err : 'Hibás válasz (HTTP ' . $code . ')'); }
    $s = $db['settings']; $names = ical_sources(); $today = today(); $seen = array(); $add = 0; $upd = 0; $del = 0; $conf = 0;
    foreach (ical_parse($body) as $e) {
        if ($e['end'] < $today) { continue; }
        $uid = $src . ':' . $e['uid']; $seen[$uid] = 1; $found = false;
        if (in_array($uid, (array) $s['ext_ignored'], true)) { continue; }   /* tulajdonos törölte, ne jöjjön vissza */
        foreach ($db['bookings'] as $i => $b) {
            if (isset($b['ext_uid']) && $b['ext_uid'] === $uid && $b['apt'] === $apt) {
                $found = true;
                if ($b['checkin'] !== $e['start'] || $b['checkout'] !== $e['end'] || $b['status'] !== 'block') {
                    $db['bookings'][$i]['checkin'] = $e['start']; $db['bookings'][$i]['checkout'] = $e['end']; $db['bookings'][$i]['status'] = 'block'; $upd++;
                }
                break;
            }
        }
        if ($found) { continue; }
        foreach ($db['bookings'] as $b) {  /* ütközés: ugyanarra a napra itt is van foglalás */
            if ($b['apt'] === $apt && in_array(eff_status($s, $b), array('pending', 'approved', 'paid'), true) && $b['checkin'] < $e['end'] && $b['checkout'] > $e['start']) {
                $conf++;
                send_mail($s, $s['notify_email'], 'FIGYELEM: foglalási ütközés – ' . $b['ref'],
                    'A(z) ' . $names[$src] . ' naptárában új foglalás jelent meg (' . hu_date($e['start']) . ' – ' . hu_date($e['end']) . "), amely ütközik ezzel a foglalással:\n\n" . summary($s, $b)
                    . "\nA Szállás.hu / Airbnb foglalás az elsődleges, azt itt nem lehet felülírni. Kérjük, az ütköző saját foglalást rendezd (utasítsd el vagy egyeztess a vendéggel).\n");
            }
        }
        $nb = array('id' => bin2hex(random_bytes(8)), 'ref' => new_ref('ZX'), 'apt' => $apt, 'checkin' => $e['start'], 'checkout' => $e['end'],
            'adults' => 0, 'children' => 0, 'name' => '', 'phone' => '', 'email' => '', 'birth_place' => '', 'birth_date' => '', 'id_doc' => '', 'note' => '',
            'total' => 0, 'tax' => 0, 'deposit' => 0, 'created' => time(), 'source' => $src, 'ext_uid' => $uid,
            'label' => $names[$src] . ($e['summary'] ? ' – ' . $e['summary'] : ''), 'admin_note' => '', 'status' => 'block', 'log' => array(), 'ip' => '');
        set_status($nb, 'block', $names[$src] . ' naptárszinkron', 'szinkron');
        $db['bookings'][] = $nb; $add++;
    }
    foreach ($db['bookings'] as $i => $b) {  /* a külső naptárból eltűnt (lemondott) jövőbeli foglalások */
        if (isset($b['source'], $b['ext_uid']) && $b['source'] === $src && $b['apt'] === $apt && $b['checkout'] >= $today && !isset($seen[$b['ext_uid']])) { unset($db['bookings'][$i]); $del++; }
    }
    $db['bookings'] = array_values($db['bookings']);
    return array('ok' => true, 'msg' => "+$add új · $upd módosult · $del törölve" . ($conf ? " · $conf ÜTKÖZÉS!" : ''));
}
function sync_all(&$db) {
    $log = array();
    foreach (apartments($db['settings']) as $apt => $a) {
        $feeds = isset($db['settings']['ical'][$apt]) && is_array($db['settings']['ical'][$apt]) ? $db['settings']['ical'][$apt] : array();
        uksort($feeds, function ($a, $b) { $o = array('szallas' => 0, 'airbnb' => 1, 'egyeb' => 2); return (isset($o[$a]) ? $o[$a] : 9) - (isset($o[$b]) ? $o[$b] : 9); });   /* a Szállás.hu az elsődleges */
        foreach ($feeds as $src => $url) {
            if (!isset(ical_sources()[$src]) || !preg_match('#^https?://#i', (string) $url)) { continue; }
            $r = sync_feed($db, $apt, $src, $url);
            $log[$apt . '|' . $src] = array('t' => date('Y-m-d H:i'), 'ok' => $r['ok'], 'msg' => $r['msg']);
        }
    }
    $db['settings']['sync_log'] = $log; $db['settings']['last_sync'] = time();
    mark_conflicts($db);
    return $log;
}
/* saját foglalás, amely platformról érkezett foglalással ütközik → piros jelzés az adminban */
function mark_conflicts(&$db) {
    $s = $db['settings']; $names = ical_sources(); $ch = false;
    foreach ($db['bookings'] as $i => $b) {
        $c = '';
        if (!is_ext($b) && in_array(eff_status($s, $b), ZB_BLOCKING, true) && $b['checkout'] >= today()) {
            foreach ($db['bookings'] as $x) {
                if (is_ext($x) && $x['apt'] === $b['apt'] && $x['checkin'] < $b['checkout'] && $x['checkout'] > $b['checkin']) { $c = $names[$x['source']] . ': ' . hu_date($x['checkin']) . ' – ' . hu_date($x['checkout']); break; }
            }
        }
        $old = isset($b['conflict']) ? $b['conflict'] : '';
        if ($c !== $old) { $ch = true; if ($c) { $db['bookings'][$i]['conflict'] = $c; } else { unset($db['bookings'][$i]['conflict']); } }
    }
    return $ch;
}
function ext_conflict($db, $b) {
    $names = ical_sources();
    foreach ($db['bookings'] as $x) {
        if ($x['id'] !== $b['id'] && is_ext($x) && $x['apt'] === $b['apt'] && $x['checkin'] < $b['checkout'] && $x['checkout'] > $b['checkin']) { return $names[$x['source']] . ' foglalás (' . hu_date($x['checkin']) . ' – ' . hu_date($x['checkout']) . ')'; }
    }
    return '';
}
function maybe_sync(&$db, $age = 3600) { if (time() - (int) $db['settings']['last_sync'] > $age && !empty($db['settings']['ical'])) { sync_all($db); return true; } return false; }
function api_self_url() {
    $host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^a-z0-9.:-]/i', '', $_SERVER['HTTP_HOST']) : 'balatoni-udules.hu';
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    $path = isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '/virtualis-seta/api/index.php';
    return ($https ? 'https' : 'http') . '://' . $host . $path;
}
function ical_links($s) {
    $base = api_self_url() . '?r=ical&key=' . $s['ical_key'];
    $o = array();
    foreach (apartments($s) as $apt => $a) { $o[$apt] = array('airbnb' => $base . '&apt=' . $apt . '&for=airbnb', 'szallas' => $base . '&apt=' . $apt . '&for=szallas', 'altalanos' => $base . '&apt=' . $apt); }
    $o['google'] = $base . '&apt=all&reszletes=1';
    return $o;
}
function ical_esc($v) { return str_replace(array('\\', ';', ',', "\r\n", "\n"), array('\\\\', '\;', '\\,', '\\n', '\\n'), (string) $v); }
function ical_fold($line) { $o = ''; $cur = ''; foreach (preg_split('//u', $line, -1, PREG_SPLIT_NO_EMPTY) as $ch) { if (strlen($cur . $ch) > 74) { $o .= $cur . "\r\n "; $cur = ''; } $cur .= $ch; } return $o . $cur . "\r\n"; }
function ical_export($db, $apt, $for, $detail) {
    $s = $db['settings']; $aps = apartments($s); $host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^a-z0-9.-]/i', '', $_SERVER['HTTP_HOST']) : 'zephyr';
    $o = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Zephyr Apartmanhaz//Foglalas//HU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n";
    $o .= ical_fold('X-WR-CALNAME:' . ical_esc($apt === 'all' ? 'Zephyr – összes foglalás' : 'Zephyr ' . (isset($aps[$apt]) ? $aps[$apt]['name'] : $apt))) . "X-WR-TIMEZONE:Europe/Budapest\r\n";
    $stamp = gmdate('Ymd\THis\Z'); $from = add_days(today(), -60); $names = ical_sources();
    foreach ($db['bookings'] as $b) {
        if (($apt !== 'all' && $b['apt'] !== $apt) || $b['checkout'] < $from) { continue; }
        $st = eff_status($s, $b);
        if (!in_array($st, ZB_BLOCKING, true)) { continue; }
        if ($for && isset($b['source']) && $b['source'] === $for) { continue; }   /* a platform saját foglalását nem küldjük vissza */
        if ($detail) {
            $an = isset($aps[$b['apt']]) ? $aps[$b['apt']]['name'] : $b['apt'];
            $who = $st === 'block' ? ($b['label'] ? $b['label'] : 'Zárolva') . ($b['name'] ? ' – ' . $b['name'] : '') : $b['name'] . ($st === 'pending' ? ' (jóváhagyásra vár)' : ($st === 'approved' ? ' (előlegre vár)' : ''));
            $sum = $an . ': ' . $who;
            $desc = $b['phone'] || $b['email'] ? "Telefon: {$b['phone']}\nE-mail: {$b['email']}\nVendégek: {$b['adults']} felnőtt, {$b['children']} gyermek\nVégösszeg: " . money($b['total']) . "\nElőleg: " . money($b['deposit']) . "\nAzonosító: {$b['ref']}" : '';
            if (!empty($b['admin_note'])) { $desc .= ($desc ? "\n" : '') . 'Megjegyzés: ' . $b['admin_note']; }
        } else { $sum = 'Foglalt – Zephyr'; $desc = ''; }
        $o .= "BEGIN:VEVENT\r\nUID:zb-" . $b['id'] . '@' . $host . "\r\nDTSTAMP:$stamp\r\n";
        $o .= 'DTSTART;VALUE=DATE:' . str_replace('-', '', $b['checkin']) . "\r\nDTEND;VALUE=DATE:" . str_replace('-', '', $b['checkout']) . "\r\n";
        $o .= ical_fold('SUMMARY:' . ical_esc($sum)); if ($desc) { $o .= ical_fold('DESCRIPTION:' . ical_esc($desc)); }
        $o .= "TRANSP:OPAQUE\r\nEND:VEVENT\r\n";
    }
    return $o . "END:VCALENDAR\r\n";
}

/* ---------------------------------------------------------------- e-mail */
function send_mail($s, $to, $subject, $body) {
    if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL)) { return false; }
    $host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^a-z0-9.-]/i', '', $_SERVER['HTTP_HOST']) : 'balatoni-udules.hu';
    $host = preg_replace('/^www\./', '', $host);
    $from = 'foglalas@' . $host;
    $headers = 'From: =?UTF-8?B?' . base64_encode('Zephyr Apartmanház') . "?= <{$from}>\r\n"
        . ($s['email'] ? "Reply-To: {$s['email']}\r\n" : '')
        . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n";
    $subj = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    return @mail($to, $subj, chunk_split(base64_encode($body)), $headers, '-f' . $from);
}
function summary($s, $b) {
    $aps = apartments($s);
    $apt = isset($aps[$b['apt']]) ? $aps[$b['apt']]['name'] : $b['apt'];
    return "Foglalási azonosító: {$b['ref']}\nApartman: {$apt}\n"
        . 'Érkezés: ' . hu_date($b['checkin']) . ' ' . $s['checkin'] . "-tól\n"
        . 'Távozás: ' . hu_date($b['checkout']) . ' ' . $s['checkout'] . "-ig\n"
        . 'Éjszakák: ' . nights($b['checkin'], $b['checkout']) . "\n"
        . 'Vendégek: ' . (int) $b['adults'] . ' felnőtt' . ((int) $b['children'] ? ', ' . (int) $b['children'] . ' gyermek' : '') . "\n"
        . (!empty($b['group']) ? 'Csoportos foglalás: ' . $b['group'] . ' (' . (int) $b['group_size'] . " apartman)\n" : '')
        . (!empty($b['discount']) ? 'Stégjáték-kedvezmény (' . (int) $b['discount_pct'] . '% a szállásdíjból): -' . money($b['discount']) . "\n" : '')
        . 'Végösszeg (idegenforgalmi adóval): ' . money($b['total']) . "\nElőleg: " . money($b['deposit']) . "\n";
}
function footer($s) { return "\nÜdvözlettel:\nZephyr Apartmanház\n{$s['address']}\nTel.: {$s['phone']}\nE-mail: {$s['email']}\n" . ($s['ntak'] ? "NTAK regisztrációs szám: {$s['ntak']}\n" : ''); }
function szep_list($s) {
    $o = array();
    if ($s['szep_otp']) { $o[] = array('OTP Széchenyi Pihenőkártya', 'szerződésszám', $s['szep_otp']); }
    if ($s['szep_mbh']) { $o[] = array('MBH (MKB) Széchenyi Pihenőkártya', 'szerződésszám', $s['szep_mbh']); }
    if ($s['szep_kh']) { $o[] = array('K&H Széchenyi Pihenőkártya', 'elfogadóhely-azonosító', $s['szep_kh']); }
    return $o;
}
function pay_text($s, $b) {
    $t = "BELFÖLDI ÁTUTALÁS\nKedvezményezett: {$s['bank_holder']}\n" . ($s['bank_name'] ? "Bank: {$s['bank_name']}\n" : '') . ($s['bank_account'] ? "Számlaszám: {$s['bank_account']}\n" : '');
    if ($s['bank_iban']) {
        $t .= "\nKÜLFÖLDI ÁTUTALÁS / INTERNATIONAL TRANSFER\nBeneficiary: {$s['bank_holder']}\nIBAN: {$s['bank_iban']}\n" . ($s['bank_swift'] ? "SWIFT/BIC: {$s['bank_swift']}\n" : '')
            . ($s['bank_name'] ? "Bank: {$s['bank_name']}\n" : '') . ($s['bank_address'] ? "Bank address: {$s['bank_address']}\n" : '') . "Reference: {$b['ref']}\n(Kérjük, az utalás költségét a küldő fél viselje – „OUR” opció.)\n";
    }
    $sz = szep_list($s);
    if ($sz) {
        $t .= "\nSZÉP-KÁRTYA (szállás alszámla)\nAz előleget a kártyakibocsátó online felületén SZÉP-kártyáról is elutalhatja nekünk, vagy érkezéskor a helyszínen is fizethet vele:\n";
        foreach ($sz as $x) { $t .= "– {$x[0]}: {$x[1]} {$x[2]}\n"; }
        $t .= "Elfogadóhely: Zephyr Apartmanház, {$s['address']}\n";
    }
    return $t;
}
function mail_received($s, $b) {
    send_mail($s, $b['email'], 'Foglalási kérés megérkezett – ' . $b['ref'] . ' – Zephyr Apartmanház',
        "Kedves {$b['name']}!\n\nKöszönjük foglalási kérését, megkaptuk. A kiválasztott napokat ideiglenesen lefoglaltuk.\n"
        . "Hamarosan ellenőrizzük, és jóváhagyás után e-mailben küldjük az előleg átutalásához szükséges adatokat. A foglalás az előleg beérkezésével válik véglegessé.\n\n"
        . summary($s, $b) . footer($s));
}
function mail_admin_new($s, $b) {
    $link = (isset($_SERVER['HTTP_HOST']) ? 'https://' . $_SERVER['HTTP_HOST'] : '') . preg_replace('#/api/.*$#', '/', $_SERVER['REQUEST_URI']) . '#foglalas-admin';
    send_mail($s, $s['notify_email'], 'ÚJ FOGLALÁSI KÉRÉS – ' . $b['ref'],
        "Új foglalási kérés érkezett a virtuális sétából.\n\n" . summary($s, $b)
        . "\nFoglaló: {$b['name']}\nTelefon: {$b['phone']}\nE-mail: {$b['email']}\n" . ($b['note'] ? "Megjegyzés: {$b['note']}\n" : '')
        . "\nJóváhagyás vagy elutasítás (tulajdonosi belépés):\n{$link}\n\n"
        . 'Ha ' . (int) $s['pending_days'] . " napon belül nem hagyod jóvá, a kérés lejár, és a napok újra szabadok lesznek.\n");
}
function group_summary($s, $bs) {
    $t = 'Csoportos foglalás: ' . $bs[0]['group'] . ' – ' . count($bs) . " apartman ugyanarra az időszakra\n\n"; $tot = 0; $dep = 0;
    foreach ($bs as $b) { $t .= summary($s, $b) . "\n"; $tot += (int) $b['total']; $dep += (int) $b['deposit']; }
    return $t . 'Összesen (idegenforgalmi adóval): ' . money($tot) . "\nElőleg összesen: " . money($dep) . "\n";
}
function mail_received_group($s, $bs) {
    $b = $bs[0];
    send_mail($s, $b['email'], 'Foglalási kérés megérkezett – ' . $b['group'] . ' – Zephyr Apartmanház',
        "Kedves {$b['name']}!\n\nKöszönjük foglalási kérését, megkaptuk. A kiválasztott apartmanokat ideiglenesen lefoglaltuk.\n"
        . "Hamarosan ellenőrizzük, és jóváhagyás után apartmanonként e-mailben küldjük az előleg átutalásához szükséges adatokat. A foglalás az előleg beérkezésével válik véglegessé.\n\n"
        . group_summary($s, $bs) . footer($s));
}
function mail_admin_new_group($s, $bs) {
    $b = $bs[0];
    $link = (isset($_SERVER['HTTP_HOST']) ? 'https://' . $_SERVER['HTTP_HOST'] : '') . preg_replace('#/api/.*$#', '/', $_SERVER['REQUEST_URI']) . '#foglalas-admin';
    send_mail($s, $s['notify_email'], 'ÚJ CSOPORTOS FOGLALÁSI KÉRÉS – ' . $b['group'] . ' (' . count($bs) . ' apartman)',
        "Új csoportos foglalási kérés érkezett.\n\n" . group_summary($s, $bs)
        . "\nFoglaló: {$b['name']}\nTelefon: {$b['phone']}\nE-mail: {$b['email']}\n" . ($b['note'] ? "Megjegyzés: {$b['note']}\n" : '')
        . "\nAz apartmanonkénti kéréseket a tulajdonosi felületen külön-külön hagyhatod jóvá:\n{$link}\n");
}
function mail_approved($s, $b) {
    $deadline = hu_date(date('Y-m-d', time() + max(1, (int) $s['pay_days']) * 86400));
    return send_mail($s, $b['email'], 'Foglalás jóváhagyva – előleg utalása – ' . $b['ref'],
        "Kedves {$b['name']}!\n\nÖrömmel értesítjük, hogy foglalási kérését jóváhagytuk.\n"
        . "A foglalás véglegesítéséhez kérjük, utalja át az előleget {$deadline}-ig az alábbi adatokkal:\n\n"
        . 'Összeg: ' . money($b['deposit']) . "\nKözlemény: {$b['ref']}\n\n" . pay_text($s, $b) . "\n"
        . "Az előleg beérkezése után visszaigazoló e-mailt küldünk. A fennmaradó összeget érkezéskor kell rendezni" . (szep_list($s) ? ' (SZÉP-kártyát is elfogadunk)' : '') . ".\n\n"
        . summary($s, $b) . footer($s));
}
function mail_paid($s, $b) {
    return send_mail($s, $b['email'], 'Foglalás visszaigazolva – ' . $b['ref'] . ' – Zephyr Apartmanház',
        "Kedves {$b['name']}!\n\nAz előleget megkaptuk, foglalása ezzel végleges. Szeretettel várjuk!\n\n"
        . summary($s, $b) . 'Érkezéskor fizetendő: ' . money(max(0, (int) $b['total'] - (int) $b['deposit'])) . "\n" . footer($s));
}
function mail_rejected($s, $b, $reason) {
    send_mail($s, $b['email'], 'Foglalási kérés – ' . $b['ref'] . ' – Zephyr Apartmanház',
        "Kedves {$b['name']}!\n\nSajnálattal értesítjük, hogy a kért időszakra nem tudjuk elfogadni foglalását.\n"
        . ($reason ? "\n{$reason}\n" : '') . "\nHa más időpont is megfelelne, szívesen segítünk.\n\n" . summary($s, $b) . footer($s));
}
function mail_cancelled($s, $b, $reason) {
    send_mail($s, $b['email'], 'Foglalás törölve – ' . $b['ref'] . ' – Zephyr Apartmanház',
        "Kedves {$b['name']}!\n\nFoglalását töröltük.\n" . ($reason ? "\n{$reason}\n" : '') . "\n" . summary($s, $b) . footer($s));
}

/* ---------------------------------------------------------------- admin azonosítás */
function body() {
    static $b = null;
    if ($b === null) { $b = json_decode((string) file_get_contents('php://input'), true); if (!is_array($b)) { $b = array(); } }
    return $b;
}
function token_in() {
    if (!empty($_SERVER['HTTP_X_ZEPHYR_TOKEN'])) { return (string) $_SERVER['HTTP_X_ZEPHYR_TOKEN']; }
    $b = body(); return isset($b['token']) ? (string) $b['token'] : '';
}
function require_admin(&$db) {
    $t = token_in();
    $now = time();
    foreach ($db['tokens'] as $k => $exp) { if ($exp < $now) { unset($db['tokens'][$k]); } }
    if ($t === '' || !isset($db['tokens'][hash('sha256', $t)])) { fail('Lejárt vagy hiányzó belépés. Kérjük, lépj be újra.', 401); }
}
function rate_hit(&$db, $key, $limit, $window) {
    $now = time();
    $k = $key . ':' . hash('sha256', client_ip());
    $arr = isset($db['rl'][$k]) ? array_values(array_filter($db['rl'][$k], function ($t) use ($now, $window) { return $t > $now - $window; })) : array();
    foreach ($db['rl'] as $kk => $v) { if (!$v || max($v) < $now - 86400) { unset($db['rl'][$kk]); } }
    if (count($arr) >= $limit) { return false; }
    $arr[] = $now; $db['rl'][$k] = $arr;
    return true;
}
function public_booking($s, $b) {
    $b['status'] = eff_status($s, $b);
    $b['nights'] = nights($b['checkin'], $b['checkout']);
    unset($b['ip']);
    return $b;
}

/* ---------------------------------------------------------------- hulladékszállítás + emlékeztetők (admin app) */
function waste_kinds() { return array('weekly' => 'hetente', 'biweekly' => 'kéthetente', 'monthly' => 'havonta', 'dates' => 'csak megadott napokon'); }
function waste_clean($in) {
    $o = array(); $colors = array('#5b6b7a', '#2a86ad', '#f2b233', '#3c9a5f', '#8a6630', '#e2483d', '#7a5cc2');
    foreach (array_slice(is_array($in) ? $in : array(), 0, 12) as $i => $t) {
        if (!is_array($t)) { continue; }
        $name = clean(isset($t['name']) ? $t['name'] : '', 60); if ($name === '') { continue; }
        $kind = isset($t['kind']) && isset(waste_kinds()[$t['kind']]) ? $t['kind'] : 'weekly';
        $dates = array(); foreach ((array) (isset($t['dates']) ? $t['dates'] : array()) as $d) { if (valid_date($d)) { $dates[] = $d; } }
        $skip = array(); foreach ((array) (isset($t['skip']) ? $t['skip'] : array()) as $d) { if (valid_date($d)) { $skip[] = $d; } }
        $start = isset($t['start']) && valid_date($t['start']) ? $t['start'] : today();
        $col = isset($t['color']) && preg_match('/^#[0-9a-f]{6}$/i', $t['color']) ? $t['color'] : $colors[$i % count($colors)];
        $o[] = array('id' => isset($t['id']) && preg_match('/^[a-f0-9]{6,16}$/', (string) $t['id']) ? (string) $t['id'] : bin2hex(random_bytes(5)),
            'name' => $name, 'kind' => $kind, 'weekday' => max(0, min(6, (int) (isset($t['weekday']) ? $t['weekday'] : 1))),
            'nth' => max(-1, min(4, (int) (isset($t['nth']) ? $t['nth'] : 1))), 'start' => $start,
            'season_from' => isset($t['season_from']) && preg_match('/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/', $t['season_from']) ? $t['season_from'] : '',
            'season_to' => isset($t['season_to']) && preg_match('/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/', $t['season_to']) ? $t['season_to'] : '',
            'dates' => array_values(array_unique($dates)), 'skip' => array_values(array_unique($skip)),
            'note' => clean(isset($t['note']) ? $t['note'] : '', 160), 'color' => $col, 'active' => !isset($t['active']) || $t['active'] ? 1 : 0);
    }
    return $o;
}
/* a megadott időszak szállítási napjai: [['date' => …, 'id' => …, 'name' => …, 'note' => …, 'color' => …], …] */
function waste_dates($types, $from, $to) {
    $o = array();
    foreach ((array) $types as $t) {
        if (empty($t['active'])) { continue; }
        $hit = array();
        if ($t['kind'] === 'dates') { foreach ($t['dates'] as $d) { if ($d >= $from && $d <= $to) { $hit[] = $d; } } }
        else {
            for ($d = $from; $d <= $to; $d = add_days($d, 1)) {
                if (weekday($d) !== (int) $t['weekday']) { continue; }
                if ($t['season_from'] && $t['season_to'] && !md_in(substr($d, 5), $t['season_from'], $t['season_to'])) { continue; }
                if ($t['kind'] === 'weekly') { $hit[] = $d; }
                elseif ($t['kind'] === 'biweekly') { $diff = nights($t['start'], $d); if ($diff % 14 === 0 || (-$diff) % 14 === 0) { $hit[] = $d; } }
                elseif ($t['kind'] === 'monthly') {
                    $dom = (int) substr($d, 8, 2); $n = (int) ceil($dom / 7);
                    $last = (int) date('t', strtotime($d . ' 12:00')) - $dom < 7;
                    if (((int) $t['nth'] === -1 && $last) || (int) $t['nth'] === $n) { $hit[] = $d; }
                }
            }
            foreach ($t['dates'] as $d) { if ($d >= $from && $d <= $to) { $hit[] = $d; } }   /* pótnapok */
        }
        foreach (array_unique($hit) as $d) {
            if (in_array($d, $t['skip'], true)) { continue; }
            $o[] = array('date' => $d, 'id' => $t['id'], 'name' => $t['name'], 'note' => $t['note'], 'color' => $t['color']);
        }
    }
    usort($o, function ($a, $b) { return strcmp($a['date'] . $a['name'], $b['date'] . $b['name']); });
    return $o;
}
function hu_day($ymd) { $n = array('vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'); return $n[weekday($ymd)]; }
function apt_name($s, $id) { $a = apartments($s); return isset($a[$id]) ? $a[$id]['name'] : $id; }
function guest_line($s, $b) {
    $st = eff_status($s, $b);
    $who = $st === 'block' ? ($b['label'] ? $b['label'] : 'Zárolva') . ($b['name'] ? ' – ' . $b['name'] : '') : ($b['name'] ? $b['name'] : 'vendég');
    $src = !empty($b['source']) && isset(ical_sources()[$b['source']]) ? ' [' . ical_sources()[$b['source']] . ']' : '';
    $pp = (int) $b['adults'] + (int) $b['children'];
    return '  • ' . apt_name($s, $b['apt']) . ': ' . $who . $src . ($pp && $st !== 'block' ? ', ' . $pp . ' fő' : '') . ($b['phone'] ? ', tel.: ' . $b['phone'] : '')
        . ' (' . nights($b['checkin'], $b['checkout']) . ' éj)' . ($st === 'pending' ? ' – JÓVÁHAGYÁSRA VÁR' : ($st === 'approved' ? ' – előlegre vár' : ''));
}
function moves_on($db, $day) {   /* aznapi érkezők és távozók */
    $s = $db['settings']; $in = array(); $out = array();
    foreach ($db['bookings'] as $b) {
        if (!in_array(eff_status($s, $b), ZB_BLOCKING, true)) { continue; }
        if ($b['checkin'] === $day) { $in[] = $b; }
        if ($b['checkout'] === $day) { $out[] = $b; }
    }
    return array($in, $out);
}
function remind_text($db, $day, $weekly) {   /* $day = a nap, amelyről szól (holnap); $weekly: 7 napos áttekintés */
    $s = $db['settings']; $parts = array();
    if (!empty($s['remind_waste'])) {
        $w = waste_dates(isset($db['waste']) ? $db['waste'] : array(), $day, $day);
        if ($w) {
            $t = "HULLADÉKSZÁLLÍTÁS HOLNAP (" . hu_day($day) . ', ' . hu_date($day) . "):\n";
            foreach ($w as $x) { $t .= '  • ' . $x['name'] . ($x['note'] ? ' – ' . $x['note'] : '') . "\n"; }
            $parts[] = $t . "  → Ma este tedd ki a kukát!\n";
        }
    }
    $days = $weekly ? 7 : ($s['guest_mode'] === 'off' ? 0 : 1);
    $g = '';
    for ($i = 0; $i < $days; $i++) {
        $d = add_days($day, $i); list($in, $out) = moves_on($db, $d);
        if (!$in && !$out) { continue; }
        $g .= ucfirst(hu_day($d)) . ', ' . hu_date($d) . ":\n";
        if ($out) { $g .= " Távozik ({$s['checkout']}-ig):\n"; foreach ($out as $b) { $g .= guest_line($s, $b) . "\n"; } }
        if ($in) { $g .= " Érkezik ({$s['checkin']}-tól):\n"; foreach ($in as $b) { $g .= guest_line($s, $b) . "\n"; } }
        $sw = array_intersect(array_map(function ($b) { return $b['apt']; }, $in), array_map(function ($b) { return $b['apt']; }, $out));
        if ($sw) { $g .= '  ⚠ Aznapi vendégváltás (' . implode(', ', array_map(function ($a) use ($s) { return apt_name($s, $a); }, array_values(array_unique($sw)))) . ") – takarítás {$s['checkout']} és {$s['checkin']} között.\n"; }
    }
    if ($g !== '') { $parts[] = ($weekly ? "VENDÉGFOGADÁS – A KÖVETKEZŐ 7 NAP:\n" : "VENDÉGFOGADÁS HOLNAP:\n") . $g; }
    elseif ($weekly) { $parts[] = "VENDÉGFOGADÁS – A KÖVETKEZŐ 7 NAP:\n  Nincs érkező vagy távozó vendég.\n"; }
    return $parts;
}
/* naponta egyszer, a beállított óra után: e-mail a holnapi teendőkről (a tárhely ütemezője vagy bármely oldalbetöltés indítja) */
function remind_due($db) {
    $s = $db['settings'];
    return (int) date('G') >= (int) $s['remind_hour'] && (!isset($db['remind_sent']) || $db['remind_sent'] !== today());
}
function remind_run(&$db, $force = false) {
    $s = $db['settings']; $tomorrow = add_days(today(), 1);
    $weekly = $s['guest_mode'] === 'week' && weekday(today()) === (int) $s['week_day'];
    $parts = remind_text($db, $tomorrow, $weekly);
    if ($s['guest_mode'] === 'week' && !$weekly) {   /* heti módban a köztes napokon csak a hulladék megy */
        $parts = array_values(array_filter($parts, function ($p) { return strpos($p, 'HULLADÉK') === 0; }));
    }
    $db['remind_sent'] = today();
    if (!$parts && !$force) { return array(false, 'Holnapra nincs teendő.'); }
    if (!$parts) { $parts = array("Holnapra (" . hu_date($tomorrow) . ") nincs hulladékszállítás és vendégmozgás.\n"); }
    $to = $s['remind_email'] ? $s['remind_email'] : $s['notify_email'];
    $subj = 'Zephyr – ' . ($weekly ? 'heti áttekintés' : 'holnapi teendők') . ' (' . hu_day($tomorrow) . ', ' . hu_date($tomorrow) . ')';
    $ok = send_mail($s, $to, $subj, "Szia!\n\n" . implode("\n", $parts) . "\nRészletek az admin appban.\n");
    return array($ok, $ok ? 'Emlékeztető elküldve ide: ' . $to : 'A szerver nem tudta elküldeni az e-mailt.');
}
function teendok_ical($db) {
    $s = $db['settings']; $host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^a-z0-9.-]/i', '', $_SERVER['HTTP_HOST']) : 'zephyr';
    $o = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Zephyr Apartmanhaz//Teendok//HU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:Zephyr – teendők\r\nX-WR-TIMEZONE:Europe/Budapest\r\nREFRESH-INTERVAL;VALUE=DURATION:PT6H\r\n";
    $stamp = gmdate('Ymd\THis\Z'); $from = add_days(today(), -7); $to = add_days(today(), 400);
    $h = max(0, min(23, (int) $s['remind_hour'])); $trig = '-PT' . (24 - $h) . 'H';   /* előző nap a beállított órakor */
    foreach (waste_dates(isset($db['waste']) ? $db['waste'] : array(), $from, $to) as $x) {
        $o .= "BEGIN:VEVENT\r\nUID:zw-" . $x['id'] . '-' . $x['date'] . '@' . $host . "\r\nDTSTAMP:$stamp\r\n";
        $o .= 'DTSTART;VALUE=DATE:' . str_replace('-', '', $x['date']) . "\r\nDTEND;VALUE=DATE:" . str_replace('-', '', add_days($x['date'], 1)) . "\r\n";
        $o .= ical_fold('SUMMARY:' . ical_esc('🗑 ' . $x['name'] . ' – szállítás')); if ($x['note']) { $o .= ical_fold('DESCRIPTION:' . ical_esc($x['note'])); }
        $o .= "TRANSP:TRANSPARENT\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\n" . ical_fold('DESCRIPTION:' . ical_esc('Holnap ' . $x['name'] . ' – ma este tedd ki a kukát!')) . "TRIGGER:$trig\r\nEND:VALARM\r\nEND:VEVENT\r\n";
    }
    if ($s['guest_mode'] !== 'off') {
        $gt = $s['guest_mode'] === 'week' ? '-P7D' : $trig;
        foreach ($db['bookings'] as $b) {
            if (!in_array(eff_status($s, $b), ZB_BLOCKING, true) || $b['checkin'] < $from || $b['checkin'] > $to || eff_status($s, $b) === 'block') { continue; }
            $o .= "BEGIN:VEVENT\r\nUID:zg-" . $b['id'] . '@' . $host . "\r\nDTSTAMP:$stamp\r\n";
            $o .= 'DTSTART;VALUE=DATE:' . str_replace('-', '', $b['checkin']) . "\r\nDTEND;VALUE=DATE:" . str_replace('-', '', add_days($b['checkin'], 1)) . "\r\n";
            $o .= ical_fold('SUMMARY:' . ical_esc('🛎 Érkezik: ' . apt_name($s, $b['apt']) . ' – ' . ($b['name'] ? $b['name'] : 'vendég')));
            $o .= ical_fold('DESCRIPTION:' . ical_esc(trim(guest_line($s, $b), " •") . "\nTávozás: " . hu_date($b['checkout'])));
            $o .= "TRANSP:TRANSPARENT\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\n" . ical_fold('DESCRIPTION:' . ical_esc('Vendégérkezés: ' . apt_name($s, $b['apt']))) . "TRIGGER:$gt\r\nEND:VALARM\r\nEND:VEVENT\r\n";
        }
    }
    return $o . "END:VCALENDAR\r\n";
}
function waste_payload($db) {
    $s = $db['settings']; $t = today();
    return array('today' => $t, 'types' => isset($db['waste']) ? $db['waste'] : array(), 'upcoming' => waste_dates(isset($db['waste']) ? $db['waste'] : array(), $t, add_days($t, 120)),
        'kinds' => waste_kinds(), 'feed' => api_self_url() . '?r=teendok_ical&key=' . $s['ical_key'], 'cron' => api_self_url() . '?r=cron&key=' . $s['ical_key'],
        'last_sent' => isset($db['remind_sent']) ? $db['remind_sent'] : '');
}

/* ================================================================ útvonalak */
$r = isset($_GET['r']) ? preg_replace('/[^a-z_]/', '', $_GET['r']) : '';
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$P = body();

switch ($r) {

/* ------------------------------ vendég */
case 'config':
    $db = db_load(); $s = $db['settings'];
    $apts = array();
    foreach (apartments($s, true) as $a) {
        $min = (int) $a['price'];
        foreach ((array) $s['seasons'] as $se) { if (!empty($se['prices'][$a['id']]) && (int) $se['prices'][$a['id']] < $min) { $min = (int) $se['prices'][$a['id']]; } }
        $apts[] = array('id' => $a['id'], 'name' => $a['name'], 'no' => (int) $a['no'], 'cap' => (int) $a['cap'], 'price' => $min, 'color' => $a['color']);
    }
    $szep = array(); foreach (array('szep_otp' => 'OTP', 'szep_mbh' => 'MBH', 'szep_kh' => 'K&H') as $k => $n) { if ($s[$k]) { $szep[] = $n; } }
    out(array('demo' => false, 'today' => today(), 'tax' => (int) $s['tax'], 'deposit_pct' => (int) $s['deposit_pct'],
        'min_nights' => (int) $s['min_nights'], 'max_nights' => (int) $s['max_nights'], 'lead_days' => (int) $s['lead_days'], 'horizon_days' => (int) $s['horizon_days'],
        'checkin' => $s['checkin'], 'checkout' => $s['checkout'], 'phone' => $s['phone'], 'email' => $s['email'], 'address' => $s['address'],
        'rules_url' => $s['rules_url'] !== '' ? $s['rules_url'] : '../Zephyr%20Apartman%20Kell%C3%A9kek/hazirend.pdf', 'privacy_url' => $s['privacy_url'] !== '' ? $s['privacy_url'] : '../Zephyr%20Apartman%20Kell%C3%A9kek/adatkezelesi-tajekoztato.pdf', 'apartments' => $apts,
        'ntak' => $s['ntak'], 'szep' => $szep, 'intl' => $s['bank_iban'] ? true : false));

case 'availability':
    $db = db_load(); $s = $db['settings'];
    $apt = isset($_GET['apt']) ? preg_replace('/[^a-z]/', '', $_GET['apt']) : '';
    $aps = apartments($s, true);
    if (!isset($aps[$apt])) { fail('Ismeretlen apartman.'); }
    $from = isset($_GET['from']) ? (string) $_GET['from'] : ''; $to = isset($_GET['to']) ? (string) $_GET['to'] : '';
    if (!valid_date($from) || $from < today()) { $from = today(); }
    if (!valid_date($to) || $to <= $from) { $to = add_days($from, 400); }
    if (nights($from, $to) > 430) { $to = add_days($from, 430); }
    if (maybe_sync($db)) { db_save($db); }
    $busy = busy_map($db, $apt, $from, $to);
    $days = array();
    for ($d = $from; $d < $to; $d = add_days($d, 1)) { $days[] = array('d' => $d, 'p' => price_for($s, $apt, $d), 'free' => day_free($s, $d, $busy)); }
    out(array('apt' => $apt, 'days' => $days));

case 'book':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    if (!empty($P['website'])) { fail('A kérés nem dolgozható fel.'); }
    $db = db_load(); $s = $db['settings'];
    if (!rate_hit($db, 'book', 6, 3600)) { db_save($db); fail('Túl sok foglalási kérés érkezett erről a címről. Kérjük, hívjon minket: ' . $s['phone'], 429); }
    $aps = apartments($s, true);
    /* egy vagy több apartman ugyanarra az időszakra: apts = [{apt, adults, children}, …] */
    $items = array();
    if (!empty($P['apts']) && is_array($P['apts'])) {
        foreach (array_slice($P['apts'], 0, 6) as $it) {
            if (!is_array($it)) { continue; }
            $items[] = array('apt' => preg_replace('/[^a-z]/', '', (string) (isset($it['apt']) ? $it['apt'] : '')), 'adults' => max(0, (int) (isset($it['adults']) ? $it['adults'] : 0)), 'children' => max(0, (int) (isset($it['children']) ? $it['children'] : 0)));
        }
    } else {
        $items[] = array('apt' => isset($P['apt']) ? preg_replace('/[^a-z]/', '', (string) $P['apt']) : '', 'adults' => max(1, (int) (isset($P['adults']) ? $P['adults'] : 1)), 'children' => max(0, (int) (isset($P['children']) ? $P['children'] : 0)));
    }
    if (!$items) { fail('Válasszon apartmant.'); }
    $seen = array();
    foreach ($items as $it) {
        if (!isset($aps[$it['apt']])) { fail('Ismeretlen apartman.'); }
        if (isset($seen[$it['apt']])) { fail('Egy apartman csak egyszer szerepelhet a foglalásban.'); }
        $seen[$it['apt']] = 1;
        if ($it['adults'] < 1) { fail('Minden apartmanba legalább egy felnőtt kell (' . $aps[$it['apt']]['name'] . ').'); }
        if ($it['adults'] + $it['children'] > (int) $aps[$it['apt']]['cap']) { fail('A(z) ' . $aps[$it['apt']]['name'] . ' apartmanban legfeljebb ' . (int) $aps[$it['apt']]['cap'] . ' fő szállhat meg.'); }
    }
    $ci = isset($P['checkin']) ? (string) $P['checkin'] : ''; $co = isset($P['checkout']) ? (string) $P['checkout'] : '';
    if (!valid_date($ci) || !valid_date($co) || $co <= $ci) { fail('Hibás dátum.'); }
    $n = nights($ci, $co);
    if ($n < (int) $s['min_nights']) { fail('Legalább ' . (int) $s['min_nights'] . ' éjszakára lehet foglalni.'); }
    if ($n > (int) $s['max_nights']) { fail('Online legfeljebb ' . (int) $s['max_nights'] . ' éjszakára lehet foglalni.'); }
    $name = clean(isset($P['name']) ? $P['name'] : '', 120);
    $phone = clean(isset($P['phone']) ? $P['phone'] : '', 40);
    $email = clean(isset($P['email']) ? $P['email'] : '', 160);
    $bplace = clean(isset($P['birth_place']) ? $P['birth_place'] : '', 80);
    $bdate = isset($P['birth_date']) ? (string) $P['birth_date'] : '';
    $iddoc = strtoupper(preg_replace('/\s+/', '', clean(isset($P['id_doc']) ? $P['id_doc'] : '', 30)));
    $note = clean_ml(isset($P['note']) ? $P['note'] : '', 1000);
    if (count(preg_split('/\s+/', $name)) < 2) { fail('Kérjük, adja meg a teljes nevét.'); }
    if (strlen(preg_replace('/\D/', '', $phone)) < 8) { fail('Kérjük, adjon meg érvényes telefonszámot.'); }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { fail('Kérjük, adjon meg érvényes e-mail címet.'); }
    if (mb_strlen($bplace) < 2) { fail('Kérjük, adja meg a születési helyét.'); }
    if (!valid_date($bdate) || $bdate > add_days(today(), -18 * 365)) { fail('A foglalónak nagykorúnak kell lennie.'); }
    if (!preg_match('/^[A-Z0-9-]{5,20}$/', $iddoc)) { fail('Kérjük, adja meg a személyi igazolvány vagy útlevél számát.'); }
    if (empty($P['accept'])) { fail('A foglaláshoz el kell fogadni a házirendet és az adatkezelési tájékoztatót.'); }
    foreach ($items as $it) {
        $busy = busy_map($db, $it['apt'], $ci, $co);
        for ($d = $ci; $d < $co; $d = add_days($d, 1)) {
            if (!day_free($s, $d, $busy)) { fail('Sajnos a(z) ' . $aps[$it['apt']]['name'] . ' apartman a kiválasztott időszakban már foglalt. Kérjük, válasszon másik időpontot.', 409); }
        }
    }
    /* stégjáték-kedvezmény: a sétában 5 perc játék után kapott kód (formai ellenőrzés; egy kód egyszer használható) */
    $game = isset($P['game']) ? preg_replace('/[^A-Z0-9-]/', '', strtoupper((string) $P['game'])) : '';
    $disc_pct = 0;
    if ($game !== '' && preg_match('/^STEG-[A-Z0-9]{6,12}-[A-Z0-9]{3,6}$/', $game)) {
        $used = isset($db['settings']['game_used']) ? (array) $db['settings']['game_used'] : array();
        if (!in_array($game, $used, true)) { $disc_pct = 5; $used[] = $game; $db['settings']['game_used'] = array_slice($used, -500); }
    }
    $group = count($items) > 1 ? new_ref('ZG') : '';
    $made = array(); $sum_total = 0; $sum_dep = 0;
    foreach ($items as $it) {
        $q = quote($s, $it['apt'], $ci, $co, $it['adults'], $disc_pct);
        $b = array('id' => bin2hex(random_bytes(8)), 'ref' => new_ref('ZB'), 'apt' => $it['apt'], 'checkin' => $ci, 'checkout' => $co,
            'adults' => $it['adults'], 'children' => $it['children'], 'name' => $name, 'phone' => $phone, 'email' => $email,
            'birth_place' => $bplace, 'birth_date' => $bdate, 'id_doc' => $iddoc, 'note' => $note,
            'total' => $q['total'], 'tax' => $q['tax'], 'deposit' => $q['deposit'], 'discount' => $q['discount'], 'discount_pct' => $disc_pct, 'game' => $disc_pct ? $game : '',
            'group' => $group, 'group_size' => count($items), 'created' => time(), 'source' => 'web',
            'label' => '', 'admin_note' => '', 'status' => 'pending', 'log' => array(), 'ip' => client_ip());
        set_status($b, 'pending', $group ? 'Online foglalási kérés (csoportos: ' . $group . ')' : 'Online foglalási kérés', 'vendég');
        $db['bookings'][] = $b; $made[] = $b; $sum_total += $q['total']; $sum_dep += $q['deposit'];
    }
    db_save($db);
    if (count($made) === 1) { mail_received($s, $made[0]); mail_admin_new($s, $made[0]); }
    else { mail_received_group($s, $made); mail_admin_new_group($s, $made); }
    out(array('ok' => true, 'ref' => $group ? $group : $made[0]['ref'], 'refs' => array_map(function ($b) { return $b['ref']; }, $made), 'total' => $sum_total, 'deposit' => $sum_dep, 'discount_pct' => $disc_pct));

/* ------------------------------ admin */
case 'login':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load();
    if (!rate_hit($db, 'login', 8, 900)) { db_save($db); fail('Túl sok sikertelen próbálkozás. Várj 15 percet.', 429); }
    $pw = isset($P['password']) ? (string) $P['password'] : '';
    if (!password_verify($pw, $db['pass'])) { db_save($db); usleep(400000); fail('Hibás jelszó.', 401); }
    $tok = bin2hex(random_bytes(24));
    $db['tokens'][hash('sha256', $tok)] = time() + 30 * 86400;
    db_save($db);
    out(array('ok' => true, 'token' => $tok, 'initial' => $db['pass'] === ZB_INITIAL_HASH));

case 'logout':
    $db = db_load(); unset($db['tokens'][hash('sha256', token_in())]); db_save($db); out(array('ok' => true));

case 'me':
    $db = db_load(); require_admin($db); out(array('ok' => true, 'initial' => $db['pass'] === ZB_INITIAL_HASH));

case 'bookings':
    $db = db_load(); require_admin($db);
    $ch = maybe_sync($db); if (mark_conflicts($db)) { $ch = true; } if (remind_due($db)) { remind_run($db); $ch = true; } if ($ch) { db_save($db); }
    $s = $db['settings'];
    $list = array();
    foreach ($db['bookings'] as $b) { $list[] = public_booking($s, $b); }
    usort($list, function ($a, $b) { return strcmp($a['checkin'], $b['checkin']); });
    $warn = array();
    if (!$s['bank_account'] && !$s['bank_iban']) { $warn[] = 'Add meg a bankszámlaszámot (és külföldi utaláshoz az IBAN-t) a Beállításokban – a jóváhagyó e-mail ezt küldi el a vendégnek.'; }
    foreach ($db['bookings'] as $b) { if (!empty($b['conflict']) && in_array(eff_status($s, $b), ZB_BLOCKING, true)) { $warn[] = 'ÜTKÖZÉS: ' . $b['ref'] . ' (' . ($b['name'] ? $b['name'] : $b['label']) . ') ütközik ezzel: ' . $b['conflict'] . ' – a platformról jött foglalás az elsődleges, rendezd a saját foglalást.'; } }
    if (empty($s['prices_checked'])) { $warn[] = 'Ellenőrizd az árakat a Beállításokban (a mostaniak csak minták), majd jelöld be, hogy rendben vannak.'; }
    foreach ((array) $s['sync_log'] as $k => $l) { if (empty($l['ok'])) { $warn[] = 'Naptárszinkron hiba (' . $k . '): ' . $l['msg']; } }
    out(array('today' => today(), 'bookings' => $list, 'settings' => $s, 'warnings' => $warn, 'initial' => $db['pass'] === ZB_INITIAL_HASH, 'ical_links' => ical_links($s)));

case 'action':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db); $s = $db['settings'];
    $i = find_idx($db, isset($P['id']) ? (string) $P['id'] : '');
    if ($i < 0) { fail('Nincs ilyen foglalás.', 404); }
    $b = $db['bookings'][$i];
    $st = eff_status($s, $b);
    $do = isset($P['do']) ? (string) $P['do'] : '';
    $reason = clean_ml(isset($P['reason']) ? $P['reason'] : '', 1000);
    $notify = !empty($P['notify']);
    $msg = '';
    if (is_ext($b)) {   /* Szállás.hu / Airbnb foglalás: itt nem írható felül, csak megjegyzés vagy törlés külön megerősítéssel */
        $src = ical_sources()[$b['source']];
        if ($do === 'note') { $db['bookings'][$i]['admin_note'] = $reason; db_save($db); out(array('ok' => true, 'message' => 'Megjegyzés elmentve.')); }
        if ($do !== 'delete') { fail('Ez a foglalás a(z) ' . $src . ' oldaláról érkezett, itt nem módosítható. Módosítani a(z) ' . $src . ' felületén lehet.'); }
        if (empty($P['confirm'])) { fail('A(z) ' . $src . ' foglalás törléséhez el kell fogadnod a figyelmeztetést.'); }
        if (!empty($P['ignore'])) { $db['settings']['ext_ignored'][] = $b['ext_uid']; $db['settings']['ext_ignored'] = array_slice(array_values(array_unique($db['settings']['ext_ignored'])), -300); }
        array_splice($db['bookings'], $i, 1); mark_conflicts($db); db_save($db);
        out(array('ok' => true, 'message' => 'A(z) ' . $src . ' foglalás törölve ebből a naptárból' . (!empty($P['ignore']) ? ', a szinkron sem hozza vissza.' : '. Ha a platformon még megvan, a következő szinkronnál visszakerül.')));
    }
    $xc = ext_conflict($db, $b);
    switch ($do) {
        case 'approve':
            if (!in_array($st, array('pending', 'expired'), true)) { fail('Ez a foglalás már nem függőben van.'); }
            if (!$s['bank_account'] && !$s['bank_iban']) { fail('Előbb add meg a bankszámlaszámot a Beállításokban, mert a jóváhagyó e-mail azt tartalmazza.'); }
            if ($xc) { fail('Nem hagyható jóvá: ütközik ezzel: ' . $xc . '. A platformról érkezett foglalás az elsődleges – ezt a kérést utasítsd el.'); }
            if ($st === 'expired' && busy_map($db, $b['apt'], $b['checkin'], $b['checkout'], $b['id'])) { fail('A kérés lejárt, és közben valaki más lefoglalta a napok egy részét.'); }
            set_status($b, 'approved', 'Jóváhagyva, előleg-bekérő elküldve');
            $msg = mail_approved($s, $b) ? 'Jóváhagyva. A vendég megkapta az előleg utalásához szükséges adatokat.' : 'Jóváhagyva, de a szerver nem tudta elküldeni az e-mailt – értesítsd a vendéget telefonon.'; break;
        case 'resend':
            if ($st !== 'approved') { fail('Csak jóváhagyott foglalásnál.'); }
            $msg = mail_approved($s, $b) ? 'Az előleg-bekérő e-mailt újraküldtük.' : 'A szerver nem tudta elküldeni az e-mailt.'; break;
        case 'paid':
            if (!in_array($st, array('approved', 'pending', 'expired'), true)) { fail('Ennél a foglalásnál ez nem lehetséges.'); }
            if ($xc) { fail('Nem véglegesíthető: ütközik ezzel: ' . $xc . '. A platformról érkezett foglalás az elsődleges.'); }
            set_status($b, 'paid', 'Előleg megérkezett'); $msg = mail_paid($s, $b) ? 'A foglalás végleges, a vendég visszaigazolást kapott.' : 'A foglalás végleges, de a visszaigazoló e-mailt a szerver nem tudta elküldeni.'; break;
        case 'reject':
            set_status($b, 'rejected', $reason); if ($notify) { mail_rejected($s, $b, $reason); }
            $msg = 'Elutasítva' . ($notify ? ', a vendég e-mailt kapott.' : '.'); break;
        case 'cancel':
            set_status($b, 'cancelled', $reason); if ($notify && $b['email']) { mail_cancelled($s, $b, $reason); }
            $msg = 'Törölve, a napok felszabadultak.'; break;
        case 'delete':
            array_splice($db['bookings'], $i, 1); db_save($db); out(array('ok' => true, 'message' => 'Véglegesen törölve.'));
        case 'note':
            $b['admin_note'] = $reason; $msg = 'Megjegyzés elmentve.'; break;
        default: fail('Ismeretlen művelet.');
    }
    $db['bookings'][$i] = $b; mark_conflicts($db); db_save($db);
    out(array('ok' => true, 'message' => $msg, 'booking' => public_booking($s, $b)));

case 'manual':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db); $s = $db['settings'];
    $aps = apartments($s);
    $apt = isset($P['apt']) ? preg_replace('/[^a-z]/', '', (string) $P['apt']) : '';
    $ci = isset($P['checkin']) ? (string) $P['checkin'] : ''; $co = isset($P['checkout']) ? (string) $P['checkout'] : '';
    if (!isset($aps[$apt]) || !valid_date($ci) || !valid_date($co) || $co <= $ci) { fail('Hibás apartman vagy dátum (a távozás napja legyen az érkezés után).'); }
    $busy = busy_map($db, $apt, $ci, $co);
    if ($busy) { $f = reset($busy); fail('Ütközik egy meglévő foglalással: ' . $f['ref'] . ' (' . hu_date($f['checkin']) . ' – ' . hu_date($f['checkout']) . ').', 409); }
    $kind = (isset($P['kind']) && $P['kind'] === 'paid') ? 'paid' : 'block';
    $adults = max(1, (int) (isset($P['adults']) ? $P['adults'] : 2));
    $q = quote($s, $apt, $ci, $co, $adults);
    $b = array('id' => bin2hex(random_bytes(8)), 'ref' => new_ref('ZK'), 'apt' => $apt, 'checkin' => $ci, 'checkout' => $co,
        'adults' => $adults, 'children' => max(0, (int) (isset($P['children']) ? $P['children'] : 0)),
        'name' => clean(isset($P['name']) ? $P['name'] : '', 120), 'phone' => clean(isset($P['phone']) ? $P['phone'] : '', 40),
        'email' => clean(isset($P['email']) ? $P['email'] : '', 160), 'birth_place' => '', 'birth_date' => '', 'id_doc' => '', 'note' => '',
        'total' => $kind === 'paid' ? $q['total'] : 0, 'tax' => $kind === 'paid' ? $q['tax'] : 0, 'deposit' => 0,
        'created' => time(), 'source' => 'manual', 'label' => clean(isset($P['label']) ? $P['label'] : '', 120),
        'admin_note' => clean_ml(isset($P['admin_note']) ? $P['admin_note'] : '', 1000), 'status' => $kind, 'log' => array(), 'ip' => '');
    if ($kind === 'block' && $b['label'] === '') { $b['label'] = 'Zárolva'; }
    set_status($b, $kind, 'Kézzel rögzítve');
    $db['bookings'][] = $b; db_save($db);
    out(array('ok' => true, 'message' => 'Rögzítve: ' . $aps[$apt]['name'] . ', ' . hu_date($ci) . ' – ' . hu_date($co), 'booking' => public_booking($s, $b)));

case 'save_settings':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db); $s = $db['settings'];
    $in = isset($P['settings']) && is_array($P['settings']) ? $P['settings'] : array();
    if (isset($in['apartments']) && is_array($in['apartments'])) {
        foreach ($s['apartments'] as $k => $a) {
            foreach ($in['apartments'] as $na) {
                if (!is_array($na) || !isset($na['id']) || $na['id'] !== $a['id']) { continue; }
                if (!empty($na['name'])) { $s['apartments'][$k]['name'] = clean($na['name'], 40); }
                if (isset($na['cap'])) { $s['apartments'][$k]['cap'] = max(1, min(12, (int) $na['cap'])); }
                if (isset($na['price'])) { $s['apartments'][$k]['price'] = max(0, (int) $na['price']); }
                if (isset($na['active'])) { $s['apartments'][$k]['active'] = $na['active'] ? 1 : 0; }
            }
        }
    }
    if (isset($in['price_rules']) && is_array($in['price_rules'])) {
        $rules = array();
        foreach ($in['price_rules'] as $ru) {
            if (!is_array($ru)) { continue; }
            $f = isset($ru['from']) ? (string) $ru['from'] : ''; $t = isset($ru['to']) ? (string) $ru['to'] : '';
            if (!valid_date($f) || !valid_date($t) || empty($ru['price'])) { continue; }
            if ($t < $f) { list($f, $t) = array($t, $f); }
            $ap = isset($ru['apt']) ? preg_replace('/[^a-z]/', '', (string) $ru['apt']) : 'all';
            $rules[] = array('from' => $f, 'to' => $t, 'apt' => $ap ? $ap : 'all', 'price' => max(0, (int) $ru['price']));
        }
        $s['price_rules'] = array_slice($rules, 0, 60);
    }
    if (isset($in['seasons']) && is_array($in['seasons'])) {
        $se = array(); $mdre = '/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/';
        foreach ($in['seasons'] as $x) {
            if (!is_array($x)) { continue; }
            $f = isset($x['from']) ? trim((string) $x['from']) : ''; $t = isset($x['to']) ? trim((string) $x['to']) : '';
            if (!preg_match($mdre, $f) || !preg_match($mdre, $t)) { fail('Hibás szezon dátum (hó-nap formában kell, pl. 07-01): ' . $f . ' – ' . $t); }
            $pr = array();
            foreach ($s['apartments'] as $a) { $pr[$a['id']] = isset($x['prices'][$a['id']]) ? max(0, (int) $x['prices'][$a['id']]) : 0; }
            $se[] = array('name' => clean(isset($x['name']) ? $x['name'] : '', 40), 'from' => $f, 'to' => $t, 'prices' => $pr);
        }
        if ($se) { $s['seasons'] = array_slice($se, 0, 12); }
    }
    $ints = array('weekend_pct' => array(0, 100), 'min_nights' => array(1, 60), 'max_nights' => array(1, 120), 'lead_days' => array(0, 60),
        'horizon_days' => array(30, 420), 'tax' => array(0, 100000), 'deposit_pct' => array(0, 100), 'pending_days' => array(1, 14), 'pay_days' => array(1, 30));
    foreach ($ints as $k => $lim) { if (isset($in[$k])) { $s[$k] = max($lim[0], min($lim[1], (int) $in[$k])); } }
    if ($s['max_nights'] < $s['min_nights']) { $s['max_nights'] = $s['min_nights']; }
    foreach (array('season_from', 'season_to') as $k) {
        if (isset($in[$k])) { $v = trim((string) $in[$k]); $s[$k] = preg_match('/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/', $v) ? $v : ''; }
    }
    foreach (array('checkin', 'checkout', 'phone', 'address', 'bank_holder', 'bank_name', 'bank_account', 'bank_swift', 'bank_address', 'szep_otp', 'szep_mbh', 'szep_kh', 'ntak') as $k) { if (isset($in[$k])) { $s[$k] = clean($in[$k], 120); } }
    if (isset($in['bank_iban'])) { $s['bank_iban'] = strtoupper(preg_replace('/\s+/', ' ', clean($in['bank_iban'], 60))); }
    if (isset($in['bank_swift'])) { $s['bank_swift'] = strtoupper(preg_replace('/\s+/', '', $s['bank_swift'])); }
    foreach (array('email', 'notify_email') as $k) {
        if (isset($in[$k])) { $v = clean($in[$k], 160); if ($v !== '' && !filter_var($v, FILTER_VALIDATE_EMAIL)) { fail('Hibás e-mail cím: ' . $v); } $s[$k] = $v; }
    }
    foreach (array('rules_url', 'privacy_url') as $k) {
        if (isset($in[$k])) { $v = clean($in[$k], 300); $s[$k] = ($v === '' || preg_match('#^(https?://|\.\./|/)#i', $v)) ? $v : ''; }
    }
    if (isset($in['prices_checked'])) { $s['prices_checked'] = $in['prices_checked'] ? 1 : 0; }
    if (isset($in['remind_hour'])) { $s['remind_hour'] = max(0, min(23, (int) $in['remind_hour'])); }
    if (isset($in['week_day'])) { $s['week_day'] = max(0, min(6, (int) $in['week_day'])); }
    if (isset($in['remind_waste'])) { $s['remind_waste'] = $in['remind_waste'] ? 1 : 0; }
    if (isset($in['guest_mode'])) { $s['guest_mode'] = in_array($in['guest_mode'], array('day', 'week', 'off'), true) ? $in['guest_mode'] : 'day'; }
    if (isset($in['remind_email'])) { $v = clean($in['remind_email'], 160); if ($v !== '' && !filter_var($v, FILTER_VALIDATE_EMAIL)) { fail('Hibás e-mail cím: ' . $v); } $s['remind_email'] = $v; }
    if (isset($in['ical']) && is_array($in['ical'])) {
        $ic = array();
        foreach (apartments($s) as $apt => $a) {
            foreach (ical_sources() as $src => $nm) {
                $v = isset($in['ical'][$apt][$src]) ? clean($in['ical'][$apt][$src], 600) : '';
                if ($v !== '' && !preg_match('#^https?://#i', $v)) { fail('Hibás naptárlink (' . $a['name'] . ', ' . $nm . '): https://-sel kell kezdődnie.'); }
                if ($v !== '') { $ic[$apt][$src] = $v; }
            }
        }
        if ($ic != $s['ical']) { $s['last_sync'] = 0; }
        $s['ical'] = $ic;
    }
    if (!empty($in['regen_ical_key'])) { $s['ical_key'] = bin2hex(random_bytes(12)); }
    $db['settings'] = $s; db_save($db);
    out(array('ok' => true, 'message' => 'Beállítások elmentve.', 'settings' => $s));

case 'password':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db);
    $old = isset($P['old']) ? (string) $P['old'] : ''; $new = isset($P['new']) ? (string) $P['new'] : '';
    if (!password_verify($old, $db['pass'])) { fail('A jelenlegi jelszó nem egyezik.'); }
    if (mb_strlen($new) < 8) { fail('Az új jelszó legalább 8 karakter legyen.'); }
    $db['pass'] = password_hash($new, PASSWORD_DEFAULT);
    $keep = hash('sha256', token_in());
    $db['tokens'] = array($keep => time() + 30 * 86400);   /* a többi eszközön kijelentkeztet */
    db_save($db);
    out(array('ok' => true, 'message' => 'Jelszó megváltoztatva. Más eszközökön újra be kell lépni.'));

case 'test_mail':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db); $s = $db['settings'];
    $ok = send_mail($s, $s['notify_email'], 'Próba e-mail – Zephyr foglalási rendszer', "Ez egy próba e-mail a Zephyr foglalási rendszerből.\nHa megkaptad, az értesítések működnek.\n");
    out(array('ok' => $ok, 'message' => $ok ? 'Próba e-mail elküldve ide: ' . $s['notify_email'] . '. Nézd meg a Spam mappát is.' : 'A szerver nem tudta elküldeni az e-mailt.'));

case 'sync':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db);
    $log = sync_all($db); db_save($db);
    $bad = array_filter($log, function ($l) { return empty($l['ok']); });
    out(array('ok' => true, 'message' => $log ? count($log) . ' naptár frissítve' . ($bad ? ', ' . count($bad) . ' hibás link' : '') . '.' : 'Nincs megadva külső naptárlink.', 'log' => $log));

case 'cron':  /* tárhely ütemezőből: …/api/index.php?r=cron&key=… */
    $db = db_load();
    if (!hash_equals((string) $db['settings']['ical_key'], isset($_GET['key']) ? (string) $_GET['key'] : '')) { fail('Hozzáférés megtagadva.', 403); }
    $log = sync_all($db); $rm = remind_due($db) ? remind_run($db) : null; db_save($db); out(array('ok' => true, 'log' => $log, 'remind' => $rm));

case 'ical':  /* naptár-kiküldés: Airbnb, Szállás.hu, Google Naptár */
    $db = db_load();
    if (!hash_equals((string) $db['settings']['ical_key'], isset($_GET['key']) ? (string) $_GET['key'] : '')) { fail('Hozzáférés megtagadva.', 403); }
    $apt = isset($_GET['apt']) ? preg_replace('/[^a-z]/', '', $_GET['apt']) : 'all';
    if ($apt !== 'all' && !isset(apartments($db['settings'])[$apt])) { fail('Ismeretlen apartman.', 404); }
    $for = isset($_GET['for']) ? preg_replace('/[^a-z]/', '', $_GET['for']) : '';
    if (maybe_sync($db, 900)) { db_save($db); }   /* a platformok gyakrabban kérdeznek – a Szállás.hu változása gyorsan továbbmegy */
    header('Content-Type: text/calendar; charset=utf-8');
    header('Content-Disposition: inline; filename="zephyr-' . $apt . '.ics"');
    echo ical_export($db, $apt, $for, !empty($_GET['reszletes'])); exit;

/* ------------------------------ programajánló / rendezvények (kezdőoldal) */
case 'events':
    $db = db_load(); $t = today(); $list = array();
    if (remind_due($db)) { remind_run($db); db_save($db); }   /* a kezdőoldal látogatása is elindítja a napi emlékeztetőt */
    foreach ((array) (isset($db['events']) ? $db['events'] : array()) as $e) { if ((isset($e['to']) && $e['to'] ? $e['to'] : $e['from']) >= $t && empty($e['hidden'])) { $list[] = $e; } }
    usort($list, function ($a, $b) { return strcmp($a['from'] . $a['time'], $b['from'] . $b['time']); });
    header('Cache-Control: public, max-age=300');
    out(array('today' => $t, 'events' => $list));

case 'events_all':
    $db = db_load(); require_admin($db);
    $list = isset($db['events']) ? $db['events'] : array();
    usort($list, function ($a, $b) { return strcmp($a['from'] . $a['time'], $b['from'] . $b['time']); });
    out(array('today' => today(), 'events' => $list));

case 'events_save':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db);
    $in = isset($P['events']) && is_array($P['events']) ? $P['events'] : array();
    $url = function ($v) { $v = clean($v, 400); return ($v === '' || preg_match('#^(https?://|/)#i', $v)) ? $v : 'https://' . $v; };
    $cats = array('fesztival', 'koncert', 'sport', 'gasztro', 'kultura', 'csalad', 'egyeb');
    $o = array();
    foreach (array_slice($in, 0, 400) as $e) {
        if (!is_array($e)) { continue; }
        $f = isset($e['from']) ? (string) $e['from'] : ''; $t = isset($e['to']) ? (string) $e['to'] : '';
        $title = clean(isset($e['title']) ? $e['title'] : '', 140);
        if ($title === '') { continue; }
        if (!valid_date($f)) { fail('Hibás kezdő dátum: „' . $title . '”.'); }
        if ($t !== '' && (!valid_date($t) || $t < $f)) { fail('A záró dátum nem lehet a kezdés előtt: „' . $title . '”.'); }
        $c = isset($e['cat']) && in_array($e['cat'], $cats, true) ? $e['cat'] : 'egyeb';
        $o[] = array('id' => isset($e['id']) && preg_match('/^[a-f0-9]{6,16}$/', (string) $e['id']) ? (string) $e['id'] : bin2hex(random_bytes(6)),
            'from' => $f, 'to' => $t === $f ? '' : $t, 'time' => clean(isset($e['time']) ? $e['time'] : '', 40), 'title' => $title,
            'place' => clean(isset($e['place']) ? $e['place'] : '', 140), 'cat' => $c, 'desc' => clean_ml(isset($e['desc']) ? $e['desc'] : '', 1500),
            'url' => $url(isset($e['url']) ? $e['url'] : ''), 'ticket' => $url(isset($e['ticket']) ? $e['ticket'] : ''), 'img' => $url(isset($e['img']) ? $e['img'] : ''),
            'top' => !empty($e['top']) ? 1 : 0, 'hidden' => !empty($e['hidden']) ? 1 : 0);
    }
    $db['events'] = $o; db_save($db);
    out(array('ok' => true, 'message' => count($o) . ' program elmentve.', 'events' => $o));

/* ------------------------------ viharjelzés (HungaroMet, 10 percenként frissítve) */
case 'vihar':
    $cache = ZB_DATA_DIR . '/vihar.json';
    if (!is_dir(ZB_DATA_DIR)) { @mkdir(ZB_DATA_DIR, 0750, true); }
    $c = @json_decode((string) @file_get_contents($cache), true);
    if (!is_array($c) || time() - (int) $c['t'] > 600) {
        $res = array('t' => time(), 'ok' => false, 'basins' => array());
        foreach (array('https://www.met.hu/idojaras/veszelyjelzes/tavi_viharjelzes/main.php', 'https://srnwp.met.hu/idojaras/veszelyjelzes/tavi_viharjelzes/main.php') as $u) {
            list($code, $body) = http_get($u);
            if ($code !== 200 || !$body) { continue; }
            if (preg_match_all('/<img[^>]*>/i', $body, $m)) {
                foreach ($m[0] as $tag) {
                    if (!preg_match('/viharjelzes(\d)/i', $tag, $lv)) { continue; }
                    $alt = preg_match('/alt="([^"]*)"/i', $tag, $am) ? html_entity_decode($am[1], ENT_QUOTES, 'UTF-8') : '';
                    foreach (array('nyugati' => 'nyugati', 'középső' => 'kozepso', 'kozepso' => 'kozepso', 'keleti' => 'keleti') as $k => $id) {
                        if (mb_stripos($alt, $k) !== false && !isset($res['basins'][$id])) { $res['basins'][$id] = (int) $lv[1]; }
                    }
                }
            }
            if ($res['basins']) { $res['ok'] = true; break; }
        }
        if ($res['ok'] || !is_array($c)) { @file_put_contents($cache, json_encode($res)); $c = $res; }
    }
    header('Cache-Control: public, max-age=300');
    out(array('ok' => !empty($c['ok']), 'basins' => $c['basins'], 'time' => date('Y-m-d H:i', (int) $c['t']), 'source' => 'HungaroMet – met.hu'));

/* ------------------------------ admin app: hulladékszállítás, emlékeztetők */
case 'waste':
    $db = db_load(); require_admin($db); out(waste_payload($db));

case 'waste_save':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db);
    $db['waste'] = waste_clean(isset($P['types']) ? $P['types'] : array()); db_save($db);
    out(array_merge(array('ok' => true, 'message' => 'Hulladéknaptár elmentve.'), waste_payload($db)));

case 'remind_test':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db);
    $prev = isset($db['remind_sent']) ? $db['remind_sent'] : '';
    list($ok, $msg) = remind_run($db, true);
    $db['remind_sent'] = $prev;   /* a próba nem számít bele a napi küldésbe */
    db_save($db); out(array('ok' => $ok, 'message' => $msg));

case 'teendok_ical':
    $db = db_load();
    if (!hash_equals((string) $db['settings']['ical_key'], isset($_GET['key']) ? (string) $_GET['key'] : '')) { fail('Hozzáférés megtagadva.', 403); }
    header('Content-Type: text/calendar; charset=utf-8');
    header('Content-Disposition: inline; filename="zephyr-teendok.ics"');
    echo teendok_ical($db); exit;

default:
    fail('Ismeretlen kérés.', 404);
}
