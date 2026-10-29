<?php
if (!defined('ABSPATH')) exit;

/* ---------- Apartmanok és beállítások ---------- */
function zf_default_apartments() {
    return [
        'korvett'  => ['name' => 'Korvett',  'no' => 1, 'cap' => 4, 'price' => 30000, 'active' => 1, 'color' => '#e2483d', 'ical' => ['airbnb' => '', 'szallas' => '', 'egyeb' => '']],
        'dingi'    => ['name' => 'Dingi',    'no' => 2, 'cap' => 2, 'price' => 22000, 'active' => 1, 'color' => '#3fb37f', 'ical' => ['airbnb' => '', 'szallas' => '', 'egyeb' => '']],
        'fregatt'  => ['name' => 'Fregatt',  'no' => 3, 'cap' => 4, 'price' => 30000, 'active' => 1, 'color' => '#3d8fe2', 'ical' => ['airbnb' => '', 'szallas' => '', 'egyeb' => '']],
        'kaloz'    => ['name' => 'Kalóz',    'no' => 4, 'cap' => 2, 'price' => 22000, 'active' => 1, 'color' => '#9b6be2', 'ical' => ['airbnb' => '', 'szallas' => '', 'egyeb' => '']],
        'schooner' => ['name' => 'Schooner', 'no' => 5, 'cap' => 4, 'price' => 32000, 'active' => 1, 'color' => '#2bb3c0', 'ical' => ['airbnb' => '', 'szallas' => '', 'egyeb' => '']],
    ];
}
function zf_default_settings() {
    return [
        'tax' => 600,                 // idegenforgalmi adó Ft / fő / éj (18 év felett)
        'deposit_pct' => 30,          // előleg %
        'deposit_days' => 3,          // előleg befizetési határidő (nap a visszaigazolástól)
        'min_nights' => 2,
        'max_nights' => 30,
        'lead_days' => 0,             // legkorábban ennyi nap múlva lehet érkezni (0 = akár ma)
        'horizon_days' => 400,        // ennyi napra előre foglalható
        'checkin' => '14:00', 'checkout' => '10:00',
        'pending_hours' => 72,        // ennyi óra után a jóvá nem hagyott kérés automatikusan törlődik (0 = soha)
        'retention_days' => 0,        // távozás után ennyi nappal a személyes adatok anonimizálása (0 = kézzel)
        'owner_email' => get_option('admin_email'),
        'owner_name' => 'Kucsera Balázs',
        'phone' => '+36 20 536 3120',
        'address' => '8621 Zamárdi, Gáspár András utca 58.',
        'bank_name' => '', 'bank_holder' => '', 'bank_account' => '', 'bank_iban' => '', 'bank_swift' => '',
        'rules_url' => '', 'privacy_url' => '',
        'ical_key' => wp_generate_password(24, false, false),
        'allowed_origins' => '',      // vesszővel elválasztva, ha a túra más domainen fut
        'apartments' => zf_default_apartments(),
        'sync' => [],                 // utolsó szinkron állapota
    ];
}
function zf_settings() {
    $s = get_option('zf_settings');
    if (!is_array($s)) { $s = zf_default_settings(); update_option('zf_settings', $s, false); return $s; }
    $d = zf_default_settings();
    foreach ($d as $k => $v) if (!array_key_exists($k, $s)) $s[$k] = $v;
    foreach ($d['apartments'] as $k => $v) if (empty($s['apartments'][$k])) $s['apartments'][$k] = $v;
    return $s;
}
function zf_save_settings($s) { update_option('zf_settings', $s, false); }
function zf_apts($only_active = true) {
    $a = zf_settings()['apartments'];
    if ($only_active) $a = array_filter($a, function ($x) { return !empty($x['active']); });
    uasort($a, function ($x, $y) { return $x['no'] <=> $y['no']; });
    return $a;
}

/* ---------- Adatbázis ---------- */
function zf_t($name) { global $wpdb; return $wpdb->prefix . 'zf_' . $name; }
if (!function_exists('zf_install_tables')) {
function zf_install_tables() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $c = $wpdb->get_charset_collate();
    $b = zf_t('bookings'); $p = zf_t('prices');
    dbDelta("CREATE TABLE $b (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  apt varchar(20) NOT NULL,
  checkin date NOT NULL,
  checkout date NOT NULL,
  status varchar(12) NOT NULL DEFAULT 'pending',
  source varchar(20) NOT NULL DEFAULT 'web',
  ext_uid varchar(255) NOT NULL DEFAULT '',
  ext_summary varchar(255) NOT NULL DEFAULT '',
  name varchar(190) NOT NULL DEFAULT '',
  email varchar(190) NOT NULL DEFAULT '',
  phone varchar(60) NOT NULL DEFAULT '',
  birth_place text NULL,
  birth_date text NULL,
  id_doc text NULL,
  adults tinyint(3) unsigned NOT NULL DEFAULT 0,
  children tinyint(3) unsigned NOT NULL DEFAULT 0,
  nights smallint(5) unsigned NOT NULL DEFAULT 0,
  price_total int(11) NOT NULL DEFAULT 0,
  tax_total int(11) NOT NULL DEFAULT 0,
  grand_total int(11) NOT NULL DEFAULT 0,
  deposit int(11) NOT NULL DEFAULT 0,
  paid int(11) NOT NULL DEFAULT 0,
  guest_note text NULL,
  admin_note text NULL,
  token varchar(40) NOT NULL DEFAULT '',
  ip varchar(64) NOT NULL DEFAULT '',
  created datetime NOT NULL,
  updated datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY apt_dates (apt,checkin,checkout),
  KEY status (status),
  KEY ext (source,ext_uid(100))
) $c;");
    dbDelta("CREATE TABLE $p (
  apt varchar(20) NOT NULL,
  day date NOT NULL,
  price int(11) NOT NULL,
  PRIMARY KEY  (apt,day)
) $c;");
    update_option('zf_db_ver', ZF_VER, false);
}
}

/* Foglaltságot okozó állapotok */
function zf_busy_statuses() { return ['pending', 'confirmed', 'blocked', 'external']; }
function zf_status_label($s) {
    $m = ['pending' => 'Jóváhagyásra vár', 'confirmed' => 'Visszaigazolva', 'cancelled' => 'Lemondva / törölve', 'blocked' => 'Lezárva', 'external' => 'Külső naptár'];
    return $m[$s] ?? $s;
}
function zf_source_label($s) {
    $m = ['web' => 'Weboldal', 'admin' => 'Kézi', 'airbnb' => 'Airbnb', 'szallas' => 'Szállás.hu', 'egyeb' => 'Egyéb naptár'];
    return $m[$s] ?? $s;
}

/* ---------- Dátumsegédek ---------- */
function zf_valid_date($d) {
    if (!is_string($d) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) return false;
    [$y, $m, $dd] = array_map('intval', explode('-', $d));
    return checkdate($m, $dd, $y);
}
function zf_add_days($d, $n) { return gmdate('Y-m-d', strtotime($d . ' 00:00:00 UTC') + $n * 86400); }
function zf_diff_days($a, $b) { return (int) round((strtotime($b . ' UTC') - strtotime($a . ' UTC')) / 86400); }
function zf_today() { return wp_date('Y-m-d'); }

/* ---------- Árak ---------- */
function zf_prices_map($apt, $from, $to) {
    global $wpdb;
    $rows = $wpdb->get_results($wpdb->prepare('SELECT day, price FROM ' . zf_t('prices') . ' WHERE apt=%s AND day>=%s AND day<%s', $apt, $from, $to), ARRAY_A);
    $m = [];
    foreach ($rows as $r) $m[$r['day']] = (int) $r['price'];
    return $m;
}
function zf_price_for($apt, $day, $map = null) {
    if ($map !== null && isset($map[$day])) return $map[$day];
    if ($map === null) { $m = zf_prices_map($apt, $day, zf_add_days($day, 1)); if (isset($m[$day])) return $m[$day]; }
    $a = zf_settings()['apartments'][$apt] ?? null;
    return $a ? (int) $a['price'] : 0;
}
function zf_set_prices($apt, $from, $to, $price, $weekdays = null) {
    global $wpdb;
    $n = 0;
    for ($d = $from; $d < $to; $d = zf_add_days($d, 1)) {
        $wd = (int) gmdate('N', strtotime($d . ' UTC')); // 1=hétfő … 7=vasárnap
        if (is_array($weekdays) && $weekdays && !in_array($wd, $weekdays, true)) continue;
        if ($price === null) $wpdb->delete(zf_t('prices'), ['apt' => $apt, 'day' => $d]);
        else $wpdb->replace(zf_t('prices'), ['apt' => $apt, 'day' => $d, 'price' => max(0, (int) $price)], ['%s', '%s', '%d']);
        $n++;
    }
    return $n;
}

/* ---------- Foglaltság ---------- */
function zf_bookings_overlapping($apt, $from, $to, $statuses = null, $exclude_id = 0) {
    global $wpdb;
    $statuses = $statuses ?: zf_busy_statuses();
    $in = implode(',', array_fill(0, count($statuses), '%s'));
    $sql = 'SELECT * FROM ' . zf_t('bookings') . " WHERE apt=%s AND checkin<%s AND checkout>%s AND status IN ($in) AND id<>%d ORDER BY checkin";
    return $wpdb->get_results($wpdb->prepare($sql, array_merge([$apt, $to, $from], $statuses, [(int) $exclude_id])), ARRAY_A);
}
function zf_is_free($apt, $checkin, $checkout, $exclude_id = 0) {
    return count(zf_bookings_overlapping($apt, $checkin, $checkout, null, $exclude_id)) === 0;
}
/* Napi bontás: ár + szabad-e az az éjszaka */
function zf_availability($apt, $from, $to) {
    $map = zf_prices_map($apt, $from, $to);
    $busy = [];
    foreach (zf_bookings_overlapping($apt, $from, $to) as $b) {
        for ($d = max($b['checkin'], $from); $d < min($b['checkout'], $to); $d = zf_add_days($d, 1)) $busy[$d] = $b['status'];
    }
    $s = zf_settings(); $today = zf_today();
    $first = zf_add_days($today, (int) $s['lead_days']); $last = zf_add_days($today, (int) $s['horizon_days']);
    $out = [];
    for ($d = $from; $d < $to; $d = zf_add_days($d, 1)) {
        $free = !isset($busy[$d]) && $d >= $first && $d < $last;
        $out[] = ['d' => $d, 'p' => zf_price_for($apt, $d, $map), 'free' => $free];
    }
    return $out;
}

/* ---------- Árajánlat (teljes kimutatás) ---------- */
function zf_round100($x) { return (int) (round($x / 100) * 100); }
function zf_quote($apt, $checkin, $checkout, $adults, $children) {
    $s = zf_settings();
    if (empty($s['apartments'][$apt]) || empty($s['apartments'][$apt]['active'])) return new WP_Error('apt', 'Ismeretlen apartman.');
    if (!zf_valid_date($checkin) || !zf_valid_date($checkout)) return new WP_Error('date', 'Érvénytelen dátum.');
    $n = zf_diff_days($checkin, $checkout);
    if ($n < 1) return new WP_Error('date', 'A távozás napja az érkezés utáni legyen.');
    $adults = max(0, (int) $adults); $children = max(0, (int) $children);
    $map = zf_prices_map($apt, $checkin, $checkout);
    $nights = []; $acc = 0;
    for ($d = $checkin; $d < $checkout; $d = zf_add_days($d, 1)) { $p = zf_price_for($apt, $d, $map); $nights[] = ['d' => $d, 'p' => $p]; $acc += $p; }
    $tax = $adults * $n * (int) $s['tax'];
    $total = $acc + $tax;
    $deposit = zf_round100($total * (int) $s['deposit_pct'] / 100);
    return [
        'apt' => $apt, 'apt_name' => $s['apartments'][$apt]['name'], 'checkin' => $checkin, 'checkout' => $checkout,
        'nights' => $n, 'adults' => $adults, 'children' => $children, 'per_night' => $nights,
        'accommodation' => $acc, 'tax_rate' => (int) $s['tax'], 'tax' => $tax, 'total' => $total,
        'deposit_pct' => (int) $s['deposit_pct'], 'deposit' => $deposit, 'remaining' => $total - $deposit,
        'checkin_time' => $s['checkin'], 'checkout_time' => $s['checkout'],
    ];
}
/* Foglalási szabályok ellenőrzése (vendég oldal) */
function zf_check_rules($apt, $checkin, $checkout, $adults, $children) {
    $s = zf_settings();
    $n = zf_diff_days($checkin, $checkout);
    $today = zf_today();
    if ($checkin < zf_add_days($today, (int) $s['lead_days'])) return new WP_Error('date', 'Erre a napra már nem lehet érkezést foglalni.');
    if ($checkout > zf_add_days($today, (int) $s['horizon_days'])) return new WP_Error('date', 'Ilyen távoli időpontra még nem lehet foglalni.');
    if ($n < (int) $s['min_nights']) return new WP_Error('nights', 'Legalább ' . (int) $s['min_nights'] . ' éjszakára lehet foglalni.');
    if ($n > (int) $s['max_nights']) return new WP_Error('nights', 'Legfeljebb ' . (int) $s['max_nights'] . ' éjszakára lehet online foglalni – hosszabb tartózkodáshoz kérjük, keressen minket.');
    $cap = (int) $s['apartments'][$apt]['cap'];
    if ($adults < 1) return new WP_Error('guests', 'Legalább egy felnőtt (18 év feletti) vendég szükséges.');
    if ($adults + $children > $cap) return new WP_Error('guests', 'Ebben az apartmanban legfeljebb ' . $cap . ' fő szállhat meg.');
    return true;
}

/* ---------- Titkosítás (személyi okmány, születési adatok) ---------- */
function zf_key() { return hash('sha256', wp_salt('auth') . '|zephyr-foglalas', true); }
function zf_enc($plain) {
    $plain = (string) $plain;
    if ($plain === '') return '';
    if (!function_exists('openssl_encrypt')) return 'raw:' . base64_encode($plain);
    $iv = random_bytes(16);
    $c = openssl_encrypt($plain, 'aes-256-cbc', zf_key(), OPENSSL_RAW_DATA, $iv);
    $mac = hash_hmac('sha256', $iv . $c, zf_key(), true);
    return 'enc:' . base64_encode($iv . $mac . $c);
}
function zf_dec($val) {
    $val = (string) $val;
    if ($val === '') return '';
    if (strpos($val, 'raw:') === 0) return base64_decode(substr($val, 4));
    if (strpos($val, 'enc:') !== 0) return $val;
    $bin = base64_decode(substr($val, 4));
    if (strlen($bin) < 49) return '';
    $iv = substr($bin, 0, 16); $mac = substr($bin, 16, 32); $c = substr($bin, 48);
    if (!hash_equals(hash_hmac('sha256', $iv . $c, zf_key(), true), $mac)) return '';
    $p = openssl_decrypt($c, 'aes-256-cbc', zf_key(), OPENSSL_RAW_DATA, $iv);
    return $p === false ? '' : $p;
}

/* ---------- Foglalás rekordok ---------- */
function zf_get_booking($id) {
    global $wpdb;
    return $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . zf_t('bookings') . ' WHERE id=%d', $id), ARRAY_A);
}
/* Adminnak: dekódolt, kiegészített rekord */
function zf_booking_out($b, $full = true) {
    if (!$b) return null;
    $o = $b;
    foreach (['id', 'adults', 'children', 'nights', 'price_total', 'tax_total', 'grand_total', 'deposit', 'paid'] as $k) $o[$k] = (int) $b[$k];
    $o['birth_place'] = $full ? zf_dec($b['birth_place']) : '';
    $o['birth_date'] = $full ? zf_dec($b['birth_date']) : '';
    $o['id_doc'] = $full ? zf_dec($b['id_doc']) : '';
    $o['status_label'] = zf_status_label($b['status']);
    $o['source_label'] = zf_source_label($b['source']);
    unset($o['token'], $o['ip']);
    return $o;
}
function zf_insert_booking($data) {
    global $wpdb;
    $now = current_time('mysql');
    $row = wp_parse_args($data, [
        'status' => 'pending', 'source' => 'web', 'ext_uid' => '', 'ext_summary' => '', 'name' => '', 'email' => '', 'phone' => '',
        'birth_place' => '', 'birth_date' => '', 'id_doc' => '', 'adults' => 0, 'children' => 0, 'nights' => 0,
        'price_total' => 0, 'tax_total' => 0, 'grand_total' => 0, 'deposit' => 0, 'paid' => 0, 'guest_note' => '', 'admin_note' => '',
        'token' => wp_generate_password(32, false, false), 'ip' => '', 'created' => $now, 'updated' => $now,
    ]);
    foreach (['birth_place', 'birth_date', 'id_doc'] as $k) $row[$k] = zf_enc($row[$k]);
    $ok = $wpdb->insert(zf_t('bookings'), $row);
    return $ok ? (int) $wpdb->insert_id : 0;
}
function zf_update_booking($id, $data) {
    global $wpdb;
    foreach (['birth_place', 'birth_date', 'id_doc'] as $k) if (array_key_exists($k, $data)) $data[$k] = zf_enc($data[$k]);
    $data['updated'] = current_time('mysql');
    return $wpdb->update(zf_t('bookings'), $data, ['id' => (int) $id]) !== false;
}
/* Ár újraszámolása egy meglévő foglaláshoz */
function zf_recalc_fields($apt, $checkin, $checkout, $adults, $children) {
    $q = zf_quote($apt, $checkin, $checkout, $adults, $children);
    if (is_wp_error($q)) return $q;
    return ['nights' => $q['nights'], 'price_total' => $q['accommodation'], 'tax_total' => $q['tax'], 'grand_total' => $q['total'], 'deposit' => $q['deposit']];
}

/* Advisory lock a dupla foglalás ellen */
if (!function_exists('zf_lock')) {
function zf_lock($apt) { global $wpdb; return (int) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 8)', 'zf_' . $apt)) === 1; }
function zf_unlock($apt) { global $wpdb; $wpdb->query($wpdb->prepare('SELECT RELEASE_LOCK(%s)', 'zf_' . $apt)); }
}

/* Lezárás / megnyitás napokra (egynapos 'blocked' sorok) */
function zf_block_range($apt, $from, $to, $open, $note = '') {
    global $wpdb;
    $t = zf_t('bookings'); $n = 0;
    for ($d = $from; $d < $to; $d = zf_add_days($d, 1)) {
        $next = zf_add_days($d, 1);
        if ($open) {
            /* lezárás feloldása: a napot érintő 'blocked' sorok szétvágása */
            foreach (zf_bookings_overlapping($apt, $d, $next, ['blocked']) as $b) {
                $wpdb->delete($t, ['id' => (int) $b['id']]);
                if ($b['checkin'] < $d) zf_insert_booking(['apt' => $apt, 'checkin' => $b['checkin'], 'checkout' => $d, 'status' => 'blocked', 'source' => 'admin', 'admin_note' => (string) $b['admin_note']]);
                if ($b['checkout'] > $next) zf_insert_booking(['apt' => $apt, 'checkin' => $next, 'checkout' => $b['checkout'], 'status' => 'blocked', 'source' => 'admin', 'admin_note' => (string) $b['admin_note']]);
                $n++;
            }
        } else {
            if (!count(zf_bookings_overlapping($apt, $d, $next))) { zf_insert_booking(['apt' => $apt, 'checkin' => $d, 'checkout' => $next, 'status' => 'blocked', 'source' => 'admin', 'admin_note' => $note]); $n++; }
        }
    }
    return $n;
}

/* Jóvá nem hagyott kérések lejárata */
function zf_expire_pending() {
    global $wpdb;
    $h = (int) zf_settings()['pending_hours'];
    if ($h <= 0) return;
    $limit = gmdate('Y-m-d H:i:s', current_time('timestamp') - $h * 3600);
    $rows = $wpdb->get_results($wpdb->prepare('SELECT id FROM ' . zf_t('bookings') . " WHERE status='pending' AND source='web' AND created<%s", $limit), ARRAY_A);
    foreach ($rows as $r) zf_update_booking($r['id'], ['status' => 'cancelled', 'admin_note' => trim((string) $wpdb->get_var($wpdb->prepare('SELECT admin_note FROM ' . zf_t('bookings') . ' WHERE id=%d', $r['id'])) . "\n[Automatikusan törölve: " . $h . ' óráig nem lett jóváhagyva]')]);
}
/* Adatmegőrzés: távozás után X nappal a személyes okmányadatok törlése */
function zf_retention() {
    global $wpdb;
    $days = (int) zf_settings()['retention_days'];
    if ($days <= 0) return;
    $limit = zf_add_days(zf_today(), -$days);
    $wpdb->query($wpdb->prepare('UPDATE ' . zf_t('bookings') . " SET id_doc='', birth_place='', birth_date='' WHERE checkout<%s AND (id_doc<>'' OR birth_place<>'' OR birth_date<>'')", $limit));
}

function zf_money($n) { return number_format((int) $n, 0, ',', ' ') . ' Ft'; }
function zf_hu_date($d) {
    $m = ['', 'január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
    $t = strtotime($d . ' UTC');
    return gmdate('Y', $t) . '. ' . $m[(int) gmdate('n', $t)] . ' ' . (int) gmdate('j', $t) . '.';
}
