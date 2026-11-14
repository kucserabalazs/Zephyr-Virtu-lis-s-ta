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
 *   programajánló: events (nyilvános) · events_all · events_save · ev_feeds_save · ev_import (admin) – források: iCal, RSS (eseménydátummal), WordPress „The Events Calendar” JSON
 */

date_default_timezone_set('Europe/Budapest');
mb_internal_encoding('UTF-8');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
/* az admin app a GitHub Pages-ről is elérheti a foglalási rendszert (telefonra telepített app) */
$zb_origin = isset($_SERVER['HTTP_ORIGIN']) ? (string) $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($zb_origin, array('https://kucserabalazs.github.io'), true)) {
    header('Access-Control-Allow-Origin: ' . $zb_origin); header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, X-Zephyr-Token'); header('Access-Control-Allow-Methods: GET, POST, OPTIONS'); header('Access-Control-Max-Age: 86400');
}
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

/* Az első belépési jelszó (kivonat). Belépés után a foglalási ablak admin részében megváltoztatható. */
const ZB_INITIAL_HASH = '$2y$10$AW.XpFaNg0RNYNMz/mwQaOpUvoujNL7zj9FYQK7yEcRRuJG/YY8Bq';
const ZB_ADMIN_EMAIL = 'kucserabalazs79@gmail.com';   /* ide jön a belépési ellenőrzőkód (kétlépcsős védelem) */
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
        'tax' => 600, 'deposit_pct' => 30, 'min_nights' => 1, 'max_nights' => 30, 'lead_days' => 3, 'peak_from' => '07-15', 'horizon_days' => 400,
        'season_from' => '05-15', 'season_to' => '10-15', 'weekend_pct' => 0,
        'checkin' => '15:00', 'checkout' => '10:00',
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
        /* vendég-programajánló: érkezés előtt X nappal e-mail az ott-tartózkodás programjairól */
        'waste_auto' => 1, 'waste_src' => 'https://www.siokom.hu/files/images/járatnaptárak {EV}/8621_zamardi_hulladeknaptar{EV}_vasuttol-eszakra.pdf',
        'guest_ev' => 1, 'guest_ev_days' => 7, 'guest_ev_approved' => 0, 'guest_ev_bike_km' => 25, 'ferry_url' => 'https://bahart.hu/',
    );
}

/* A Szállás.hu és az Airbnb naptárainak exportlinkjei (2026. nov. 1.) – a tulajdonosi felület Beállítások → Naptárszinkron részén módosíthatók.
   A két portál egymás naptárát is importálja, így minden apartmannál kétirányú a szinkron. */
function default_ical() {
    return array(
        'korvett'  => array('szallas' => 'https://szallas.hu/ical-sync/export/get-calendar?token=19c67fb842ff840c127463c7ed91e4496cc9cb9eb524e7da8038de31d88f0a78',
                            'airbnb'  => 'https://www.airbnb.hu/calendar/ical/1594258848235738212.ics?t=d437bfed178045f79f8d635de9a83e09'),
        'dingi'    => array('szallas' => 'https://szallas.hu/ical-sync/export/get-calendar?token=96e065ec3af6f01043b432ae3209d67501d2fd22da7f9839172f298c5e95fd9d',
                            'airbnb'  => 'https://www.airbnb.hu/calendar/ical/1486079672099298069.ics?t=a3ba0097f370489da1fd4930bd45e127'),
        'fregatt'  => array('szallas' => 'https://szallas.hu/ical-sync/export/get-calendar?token=cc6242ab3972233cb8bb243c1c08104b5cd39fcc97afb38e8ff1236347d502f1',
                            'airbnb'  => 'https://www.airbnb.hu/calendar/ical/1595715014963692300.ics?t=d9a07a1d342c43faad4d6497097b58bb'),
        'kaloz'    => array('szallas' => 'https://szallas.hu/ical-sync/export/get-calendar?token=22936353ad6073e2f00d178e6673aa24469aeea76a254e10ec833c13f233f461',
                            'airbnb'  => 'https://www.airbnb.hu/calendar/ical/1593554080580747375.ics?t=4c13cbc7331c445a9045e83bf6b21e1d'),
        'schooner' => array('szallas' => 'https://szallas.hu/ical-sync/export/get-calendar?token=fb909c220a55d128b9cacd4552a66bf2f5b87d524fa1bc77d60390bb97c84147',
                            'airbnb'  => 'https://www.airbnb.hu/calendar/ical/1597866548803099081.ics?t=2b15b0d43d7144efb6d782fc2c7bca1c'),
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
/* zárt nap a platformon (pl. családtag vagy nem fizető vendég – a Szállás.hu adminban zárolva): a naptárszinkron név és adatok nélkül hozza.
   Ez NEM hiba és nem ütközés: a nap foglalt, de nincs hozzá vendégadat, nem kell rendezni. */
function ext_closed_sum($sum) {
    $t = mb_strtolower(trim(preg_replace('/\s+/u', ' ', (string) $sum)));
    $t = preg_replace('/^[\s()–:-]+|[\s()–:-]+$/u', '', preg_replace('/^(airbnb|szállás\.hu|szallas\.hu)\s*[–:-]?\s*/u', '', $t));
    return $t === '' || (bool) preg_match('/^(not available|unavailable|blocked|closed|close|zárva|zárt( nap| napok)?|lezárva|lezárt|zárolva|zárolt|nem elérhető|nem foglalható|nem kiadható|saját használat|tulajdonosi használat)$/u', $t);
}
function is_closed_ext($b) { return is_ext($b) && !empty($b['closed']); }

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
    if (empty($db['settings']['mig_rules1109'])) {   /* egyszeri (2026. nov. 9.): a tulajdonos szabályai – 1 éjszaka is kérhető; szezonon kívül legalább 3 nappal előre, főszezonban (júl. 15-től zárásig) aznapra is */
        if ((int) $db['settings']['min_nights'] === 2) { $db['settings']['min_nights'] = 1; }
        if ((int) $db['settings']['lead_days'] < 3) { $db['settings']['lead_days'] = 3; }
        $db['settings']['mig_rules1109'] = 1;
    }
    if (empty($db['settings']['mig_ci15'])) {   /* egyszeri: érkezés 15:00-tól (a tulajdonos kérése) */
        if ($db['settings']['checkin'] === '14:00') { $db['settings']['checkin'] = '15:00'; }
        $db['settings']['mig_ci15'] = 1;
    }
    if (empty($db['settings']['mig_ical1'])) {   /* egyszeri (2026. nov. 1.): Szállás.hu + Airbnb naptárlinkek apartmanonként, ha még nincs megadva */
        $ic = is_array($db['settings']['ical']) ? $db['settings']['ical'] : array();
        foreach (default_ical() as $apt => $feeds) { foreach ($feeds as $src => $url) { if (empty($ic[$apt][$src])) { $ic[$apt][$src] = $url; } } }
        $db['settings']['ical'] = $ic; $db['settings']['last_sync'] = 0; $db['settings']['mig_ical1'] = 1;
    }
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
function today() { return !empty($GLOBALS['ZB_TODAY']) ? $GLOBALS['ZB_TODAY'] : date('Y-m-d'); }   /* (a tesztek felülírhatják) */
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
/* hány nappal előre kell foglalni: főszezonban (júl. 15-től a zárásig, amikor a tulajdonos helyben van) aznapra is, egyébként lead_days (alapból 3) */
function lead_eff($s) {
    $t = today(); $pf = isset($s['peak_from']) && $s['peak_from'] ? $s['peak_from'] : '07-15';
    return (substr($t, 5) >= $pf && in_season($s, $t)) ? 0 : (int) $s['lead_days'];
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
    if ($d < add_days(today(), lead_eff($s))) { return false; }
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
/* Dátum az iCal-ból (2026-11-06, a tulajdonos 10 pontos ellenőrzőlistája szerint):
   – egész napos (VALUE=DATE vagy 8 jegyű) dátum: SOHA nem alakítjuk időponttá / időzónává (különben a „ma” elcsúszhat);
   – időponttal (DATE-TIME): ha „Z” (UTC) vagy TZID van, a magyar helyi idő szerinti napot vesszük. */
function ical_date($v, $params = '') {
    $v = trim($v);
    if (!preg_match('/^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})?(Z)?)?/', $v, $m)) { return ''; }
    if (empty($m[4]) || stripos($params, 'VALUE=DATE') !== false && stripos($params, 'DATE-TIME') === false) { return "$m[1]-$m[2]-$m[3]"; }
    try {
        $tz = !empty($m[8]) ? new DateTimeZone('UTC') : (preg_match('/TZID=([^;:]+)/i', $params, $t) ? new DateTimeZone(trim($t[1], '"')) : new DateTimeZone('Europe/Budapest'));
    } catch (Exception $e) { $tz = new DateTimeZone('Europe/Budapest'); }
    $d = new DateTime("$m[1]-$m[2]-$m[3] $m[5]:$m[6]:" . (isset($m[7]) && $m[7] !== '' ? $m[7] : '00'), $tz);
    $d->setTimezone(new DateTimeZone('Europe/Budapest'));
    return $d->format('Y-m-d');
}
function ical_unesc($v) { return str_replace(array('\\n', '\\N', '\\,', '\;', '\\\\'), array(' ', ' ', ',', ';', '\\'), $v); }
function ical_parse($text) {
    $text = preg_replace("/\r?\n[ \t]/", '', str_replace("\r\n", "\n", (string) $text));
    $ev = array(); $cur = null;
    foreach (explode("\n", $text) as $ln) {
        $ln = rtrim($ln);
        if ($ln === 'BEGIN:VEVENT') { $cur = array('uid' => '', 'start' => '', 'end' => '', 'summary' => '', 'desc' => '', 'status' => '', 'allday' => true); continue; }
        if ($ln === 'END:VEVENT') {
            if ($cur && $cur['start']) {
                /* DTEND az egész napos eseménynél NEM része a foglalásnak: az a távozás napja (váltásnap = szabad) */
                if (!$cur['end'] || $cur['end'] <= $cur['start']) { $cur['end'] = add_days($cur['start'], 1); }
                if (!$cur['uid']) { $cur['uid'] = md5($cur['start'] . $cur['end'] . $cur['summary']); }
                if (strtoupper($cur['status']) !== 'CANCELLED') { $ev[] = $cur; }
            }
            $cur = null; continue;
        }
        if ($cur === null || ($p = strpos($ln, ':')) === false) { continue; }
        $head = substr($ln, 0, $p); $val = substr($ln, $p + 1);
        $name = strtoupper(strtok($head, ';')); $params = (string) substr($head, strlen(strtok($head, ';')));
        if ($name === 'UID') { $cur['uid'] = substr($val, 0, 200); }
        elseif ($name === 'DTSTART') { $cur['start'] = ical_date($val, $params); if (strpos($val, 'T') !== false) { $cur['allday'] = false; } }
        elseif ($name === 'DTEND') { $cur['end'] = ical_date($val, $params); }
        elseif ($name === 'SUMMARY') { $cur['summary'] = mb_substr(ical_unesc($val), 0, 120); }
        elseif ($name === 'DESCRIPTION') { $cur['desc'] = mb_substr(ical_unesc($val), 0, 400); }
        elseif ($name === 'STATUS') { $cur['status'] = $val; }
    }
    return $ev;
}
/* MI A VALÓDI FOGLALÁS ÉS MI CSAK BLOKK? – platformonként KÜLÖN szabály (egy platform szabályát nem általánosítjuk).
   Visszaad: array('reserved'|'block', indoklás). A „block” is lezárja a napot, csak nem vendég (zárt nap, átszinkronizált tétel). */
function ical_classify($src, $e) {
    $sum = mb_strtolower(trim(preg_replace('/\s+/u', ' ', (string) $e['summary']))); $desc = mb_strtolower((string) $e['desc']);
    if ($src === 'airbnb') {
        /* Airbnb: a valódi foglalás „Reserved” (a leírásban „Reservation URL” / foglalási kód); a „Airbnb (Not available)” a
           kézzel zárolt nap VAGY egy másik naptárból (pl. Szállás.hu) behúzott foglalás tükre – az nem Airbnb-vendég. */
        if ($sum === 'reserved' || strpos($desc, 'reservation url') !== false || strpos($desc, '/hosting/reservations/') !== false) { return array('reserved', 'Airbnb: Reserved'); }
        if (preg_match('/not available|unavailable|blocked/u', $sum)) { return array('block', 'Airbnb: Not available (zárolt nap vagy behúzott naptár)'); }
        return array('reserved', 'Airbnb: ismeretlen felirat – biztonság kedvéért foglalásnak vesszük');
    }
    if ($src === 'szallas') {
        /* Szállás.hu: a tulajdonosi adminban zárolt nap (családtag, nem fizető vendég) név nélkül, üres vagy „Zárva/Not available” felirattal jön. */
        if (ext_closed_sum($e['summary'])) { return array('block', 'Szállás.hu: zárt nap (név nélkül)'); }
        return array('reserved', 'Szállás.hu: foglalás');
    }
    return array('block', 'Egyéb naptár: zárolt időszak');   /* pl. saját Google Naptár – nem vendégfoglalás */
}
function http_get($url, $timeout = 12) {
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 4, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_TIMEOUT => $timeout, CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 ZephyrFoglalas/1.1', CURLOPT_HTTPHEADER => array('Accept: text/calendar, text/plain, */*')));
        $body = curl_exec($c); $code = (int) curl_getinfo($c, CURLINFO_HTTP_CODE); $err = curl_error($c); curl_close($c);
        return array($code, $body === false ? '' : $body, $err);
    }
    $ctx = stream_context_create(array('http' => array('timeout' => $timeout, 'user_agent' => 'ZephyrFoglalas/1.0'), 'ssl' => array('verify_peer' => true)));
    $body = @file_get_contents($url, false, $ctx);
    return array($body === false ? 0 : 200, $body === false ? '' : $body, $body === false ? 'letöltési hiba' : '');
}
/* ------------------------------ programajánló: segédfüggvények (2026-11) – mezők, duplikátumszűrés, forrásimport */
const EV_CATS = array('fesztival', 'koncert', 'sport', 'gasztro', 'kultura', 'csalad', 'egyeb');
const EV_TOWNS = array('Zamárdi', 'Siófok', 'Balatonföldvár', 'Szántód', 'Kőröshegy', 'Balatonszárszó', 'Balatonszemes', 'Balatonlelle', 'Balatonboglár', 'Fonyód', 'Balatonkenese', 'Balatonvilágos', 'Tihany', 'Balatonfüred', 'Balatonalmádi', 'Révfülöp', 'Badacsony', 'Szigliget', 'Keszthely', 'Hévíz', 'Balatonmáriafürdő', 'Balatonkeresztúr', 'Vonyarcvashegy', 'Csopak', 'Paloznak');
function ev_norm($s) {
    $s = mb_strtolower((string) $s);
    $s = strtr($s, array('á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ö' => 'o', 'ő' => 'o', 'ú' => 'u', 'ü' => 'u', 'ű' => 'u'));
    return trim(preg_replace('/[^a-z0-9]+/', ' ', $s));
}
/* duplikátumkulcs: név (évszámok, „2026” stb. nélkül) + kezdőnap + település */
function ev_key($e) {
    $t = preg_replace('/\b(19|20)\d{2}\b/', '', ev_norm(isset($e['title']) ? $e['title'] : ''));
    $t = implode(' ', array_slice(array_filter(explode(' ', $t)), 0, 6));
    return $t . '|' . (isset($e['from']) ? $e['from'] : '') . '|' . ev_norm(isset($e['town']) ? $e['town'] : '');
}
function ev_guess_town($txt, $def) {
    $n = ' ' . ev_norm($txt) . ' ';
    foreach (EV_TOWNS as $tw) { if (strpos($n, ' ' . ev_norm($tw) . ' ') !== false) { return $tw; } }
    return $def;
}
function ev_guess_cat($txt, $def) {
    $n = ev_norm($txt);
    $map = array('fesztival' => 'fesztival|napok|vigasso|majalis|unnep', 'csalad' => 'gyerek|csalad|baba|bab|mese|jatszohaz', 'koncert' => 'koncert|zenekar|dj |dalest|opera|jazz|rock', 'sport' => 'futas|futo|verseny|kupa|regatta|tura|kerekpar|uszas|sup |triatlon',
        'gasztro' => 'gasztro|bor|fozo|halasz|kostolo|street food|pinces', 'kultura' => 'kiallitas|szinhaz|muzeum|eloadas|mozi|film|irodalm|tarlat');
    foreach ($map as $c => $re) { if (preg_match('/' . $re . '/', $n)) { return $c; } }
    return in_array($def, EV_CATS, true) ? $def : 'egyeb';
}
function ev_flags($txt, $price) {
    $n = ev_norm($txt . ' ' . $price);
    return array('free' => preg_match('/ingyenes|dijtalan|belepes dijmentes|free entry/', $n) || trim((string) $price) === '0' ? 1 : 0,
        'kids' => preg_match('/gyerek|csalad|mese|jatszo|ovis|baba/', $n) ? 1 : 0,
        'indoor' => preg_match('/kiallitas|muzeum|szinhaz|mozi|terem|fedett|sportcsarnok|templom|galeria|konferencia/', $n) ? 1 : 0);
}
/* egy program adatainak tisztítása (kézi mentésnél és importnál is) */
function ev_clean($e, $url) {
    $f = isset($e['from']) ? (string) $e['from'] : ''; $t = isset($e['to']) ? (string) $e['to'] : '';
    $chk = isset($e['checked']) && valid_date((string) $e['checked']) ? (string) $e['checked'] : today();
    return array('id' => isset($e['id']) && preg_match('/^[a-f0-9]{6,16}$/', (string) $e['id']) ? (string) $e['id'] : bin2hex(random_bytes(6)),
        'from' => $f, 'to' => $t === $f ? '' : $t, 'time' => clean(isset($e['time']) ? $e['time'] : '', 40), 'title' => clean(isset($e['title']) ? $e['title'] : '', 140),
        'place' => clean(isset($e['place']) ? $e['place'] : '', 140), 'town' => clean(isset($e['town']) ? $e['town'] : '', 60),
        'cat' => isset($e['cat']) && in_array($e['cat'], EV_CATS, true) ? $e['cat'] : 'egyeb', 'desc' => clean_ml(isset($e['desc']) ? $e['desc'] : '', 1500),
        'price' => clean(isset($e['price']) ? $e['price'] : '', 80),
        'url' => $url(isset($e['url']) ? $e['url'] : ''), 'ticket' => $url(isset($e['ticket']) ? $e['ticket'] : ''), 'img' => $url(isset($e['img']) ? $e['img'] : ''),
        'src' => clean(isset($e['src']) ? $e['src'] : '', 80), 'checked' => $chk,
        'free' => !empty($e['free']) ? 1 : 0, 'kids' => !empty($e['kids']) ? 1 : 0, 'indoor' => !empty($e['indoor']) ? 1 : 0,
        'top' => !empty($e['top']) ? 1 : 0, 'hidden' => !empty($e['hidden']) ? 1 : 0,
        'feed' => isset($e['feed']) ? preg_replace('/[^a-f0-9]/', '', (string) $e['feed']) : '', 'ext' => isset($e['ext']) ? clean($e['ext'], 200) : '',
        'gone' => !empty($e['gone']) ? 1 : 0, 'man' => !empty($e['man']) ? 1 : 0);
}
function ev_url_fn() { return function ($v) { $v = clean($v, 400); return ($v === '' || preg_match('#^(https?://|/)#i', $v)) ? $v : 'https://' . $v; }; }
/* ---- forrásformátumok: iCal (.ics), WordPress „The Events Calendar” JSON, RSS/Atom eseménydátummal ---- */
function ev_ics_date($v, $params) {
    if (preg_match('/^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})(Z)?)?$/', $v, $m)) {
        if (empty($m[4])) { return array("$m[1]-$m[2]-$m[3]", ''); }
        $ts = gmmktime((int) $m[5], (int) $m[6], 0, (int) $m[2], (int) $m[3], (int) $m[1]);
        if (!empty($m[8])) { return array(date('Y-m-d', $ts), date('H:i', $ts)); }   /* UTC → helyi idő */
        return array("$m[1]-$m[2]-$m[3]", "$m[5]:$m[6]");
    }
    return array('', '');
}
function ev_parse_ics($body) {
    $body = preg_replace("/\r?\n[ \t]/", '', str_replace("\r\n", "\n", $body)); $out = array(); $cur = null;
    $un = function ($s) { return trim(str_replace(array('\\n', '\\N', '\\,', '\;', '\\\\'), array("\n", "\n", ',', ';', '\\'), $s)); };
    foreach (explode("\n", $body) as $ln) {
        if ($ln === 'BEGIN:VEVENT') { $cur = array(); continue; }
        if ($ln === 'END:VEVENT') { if ($cur) { $out[] = $cur; } $cur = null; continue; }
        if ($cur === null || strpos($ln, ':') === false) { continue; }
        list($k, $v) = explode(':', $ln, 2); $kp = explode(';', $k); $name = strtoupper($kp[0]);
        if ($name === 'DTSTART') { list($cur['from'], $cur['time']) = ev_ics_date(trim($v), $kp); }
        elseif ($name === 'DTEND') { list($d, $tm) = ev_ics_date(trim($v), $kp); if ($d && strlen(trim($v)) === 8) { $d = date('Y-m-d', strtotime($d . ' -1 day')); } $cur['to'] = $d; }
        elseif ($name === 'SUMMARY') { $cur['title'] = $un($v); }
        elseif ($name === 'LOCATION') { $cur['place'] = $un($v); }
        elseif ($name === 'DESCRIPTION') { $cur['desc'] = $un($v); }
        elseif ($name === 'URL') { $cur['url'] = trim($v); }
        elseif ($name === 'UID') { $cur['ext'] = trim($v); }
        elseif ($name === 'STATUS') { $cur['status'] = strtoupper(trim($v)); }
    }
    return $out;
}
function ev_parse_tribe($j) {
    $out = array();
    foreach ((array) $j['events'] as $e) {
        $v = isset($e['venue']) && is_array($e['venue']) ? $e['venue'] : array();
        $out[] = array('title' => html_entity_decode(strip_tags((string) $e['title']), ENT_QUOTES, 'UTF-8'), 'from' => substr((string) $e['start_date'], 0, 10), 'to' => substr((string) $e['end_date'], 0, 10),
            'time' => !empty($e['all_day']) ? 'egész nap' : substr((string) $e['start_date'], 11, 5), 'place' => trim((isset($v['venue']) ? $v['venue'] : '') . (isset($v['address']) && $v['address'] ? ', ' . $v['address'] : '')),
            'town' => isset($v['city']) ? (string) $v['city'] : '', 'desc' => html_entity_decode(strip_tags((string) (isset($e['excerpt']) && $e['excerpt'] ? $e['excerpt'] : $e['description'])), ENT_QUOTES, 'UTF-8'),
            'url' => (string) $e['url'], 'price' => isset($e['cost']) ? strip_tags((string) $e['cost']) : '', 'img' => isset($e['image']['url']) ? (string) $e['image']['url'] : '', 'ext' => 'tribe-' . $e['id']);
    }
    return $out;
}
function ev_parse_rss($body) {
    $out = array(); if (!function_exists('simplexml_load_string')) { return $out; }
    $x = @simplexml_load_string($body, 'SimpleXMLElement', LIBXML_NOCDATA | LIBXML_NONET); if (!$x) { return $out; }
    $items = isset($x->channel->item) ? $x->channel->item : (isset($x->entry) ? $x->entry : array());
    foreach ($items as $it) {
        $ns = $it->getNamespaces(true); $start = '';
        foreach (array('ev', 'xcal', 'event') as $p) { if (isset($ns[$p])) { $c = $it->children($ns[$p]); foreach (array('startdate', 'dtstart', 'start') as $f) { if (isset($c->$f)) { $start = (string) $c->$f; } } } }
        if ($start === '') { continue; }   /* esemény-dátum nélküli hír nem program – kihagyjuk */
        $ts = strtotime($start); if (!$ts) { continue; }
        $link = isset($it->link['href']) ? (string) $it->link['href'] : (string) $it->link;
        $out[] = array('title' => trim(strip_tags((string) $it->title)), 'from' => date('Y-m-d', $ts), 'time' => date('H:i', $ts) === '00:00' ? '' : date('H:i', $ts),
            'desc' => trim(html_entity_decode(strip_tags((string) ($it->description ? $it->description : $it->summary)), ENT_QUOTES, 'UTF-8')), 'url' => $link, 'ext' => (string) ($it->guid ? $it->guid : $link));
    }
    return $out;
}
/* egy forrás frissítése: új programok felvétele, változások átvétele, duplikátumok kihagyása, a forrásból törölt jövőbeli programok jelölése */
function ev_import_feed(&$db, &$feed) {
    list($code, $body, $err) = http_get($feed['url']);
    $feed['last'] = date('Y-m-d H:i');
    if ($code !== 200 || $body === '') { $feed['ok'] = 0; $feed['msg'] = $err ? $err : 'Hibás válasz (HTTP ' . $code . ')'; return; }
    $t = ltrim($body);
    if (strpos($t, 'BEGIN:VCALENDAR') !== false) { $items = ev_parse_ics($t); $fmt = 'iCal'; }
    elseif ($t[0] === '{' && ($j = json_decode($t, true)) && isset($j['events'])) { $items = ev_parse_tribe($j); $fmt = 'WordPress-eseménynaptár'; }
    elseif ($t[0] === '<') { $items = ev_parse_rss($t); $fmt = 'RSS'; }
    else { $feed['ok'] = 0; $feed['msg'] = 'Ismeretlen formátum (iCal, RSS vagy WordPress-eseménynaptár kell).'; return; }
    $today = today(); $max = add_days($today, 400); $url = ev_url_fn();
    $keys = array(); foreach ($db['events'] as $i => $e) { $keys[ev_key($e)] = $i; }
    $seen = array(); $add = 0; $upd = 0; $dup = 0;
    foreach ($items as $it) {
        if (empty($it['title']) || empty($it['from']) || !valid_date($it['from'])) { continue; }
        $end = !empty($it['to']) && valid_date($it['to']) ? $it['to'] : $it['from'];
        if ($end < $today || $it['from'] > $max) { continue; }
        $txt = $it['title'] . ' ' . (isset($it['desc']) ? $it['desc'] : '') . ' ' . (isset($it['place']) ? $it['place'] : '');
        $it['town'] = !empty($it['town']) ? $it['town'] : ev_guess_town($txt, isset($feed['town']) ? $feed['town'] : '');
        $it['cat'] = ev_guess_cat($txt, isset($feed['cat']) ? $feed['cat'] : 'egyeb');
        $it += ev_flags($txt, isset($it['price']) ? $it['price'] : '');
        $it['src'] = $feed['name']; $it['feed'] = $feed['id']; $it['checked'] = $today; $it['ext'] = !empty($it['ext']) ? $it['ext'] : ev_key($it);
        if (!empty($it['desc'])) { $it['desc'] = mb_substr(preg_replace('/\s+/u', ' ', $it['desc']), 0, 600); }
        $seen[$it['ext']] = 1;
        $cancel = isset($it['status']) && $it['status'] === 'CANCELLED';
        $idx = null; foreach ($db['events'] as $i => $e) { if (!empty($e['feed']) && $e['feed'] === $feed['id'] && $e['ext'] === $it['ext']) { $idx = $i; break; } }
        if ($idx !== null) {
            $old = $db['events'][$idx];
            if (!empty($old['man'])) { $db['events'][$idx]['checked'] = $today; $db['events'][$idx]['gone'] = $cancel ? 1 : 0; continue; }   /* kézzel javított program: csak az ellenőrzés dátuma frissül */
            $n = ev_clean(array_merge($old, $it, array('id' => $old['id'], 'top' => $old['top'], 'hidden' => $old['hidden'], 'gone' => $cancel ? 1 : 0)), $url);
            if ($n != $old) { $upd++; } $db['events'][$idx] = $n; continue;
        }
        if ($cancel) { continue; }
        $k = ev_key($it);
        if (isset($keys[$k])) { $dup++; $db['events'][$keys[$k]]['checked'] = $today; continue; }   /* már szerepel (kézzel vagy másik forrásból) */
        $n = ev_clean($it, $url); $db['events'][] = $n; $keys[$k] = count($db['events']) - 1; $add++;
    }
    $gone = 0;
    foreach ($db['events'] as $i => $e) {
        if (!empty($e['feed']) && $e['feed'] === $feed['id'] && !isset($seen[$e['ext']]) && ($e['to'] ? $e['to'] : $e['from']) >= $today && empty($e['gone']) && empty($e['man'])) { $db['events'][$i]['gone'] = 1; $gone++; }
    }
    $feed['ok'] = 1; $feed['count'] = count($items);
    $feed['msg'] = $fmt . ': ' . count($items) . ' tétel · ' . $add . ' új · ' . $upd . ' frissítve · ' . $dup . ' már szerepelt' . ($gone ? ' · ' . $gone . ' törölve a forrásban' : '');
}
function ev_import_all(&$db) {
    if (!isset($db['events']) || !is_array($db['events'])) { $db['events'] = array(); }
    $feeds = isset($db['settings']['ev_feeds']) && is_array($db['settings']['ev_feeds']) ? $db['settings']['ev_feeds'] : array();
    foreach ($feeds as $i => $f) { if (!empty($f['on']) && !empty($f['url'])) { ev_import_feed($db, $feeds[$i]); } }
    $db['settings']['ev_feeds'] = $feeds;
    /* a 60 napnál régebben véget ért programok automatikusan törlődnek (a tárhely tiszta marad) */
    $lim = add_days(today(), -60); $db['events'] = array_values(array_filter($db['events'], function ($e) use ($lim) { return ($e['to'] ? $e['to'] : $e['from']) >= $lim; }));
    $db['ev_sync'] = date('Y-m-d H:i');
    return $feeds;
}
function ev_due($db) { return !empty($db['settings']['ev_feeds']) && (empty($db['ev_sync']) || substr($db['ev_sync'], 0, 10) !== today()); }
/* A legutóbb letöltött nyers .ics megőrzése (ha az oldal „furcsát” mutat, előbb ezt kell megnézni – a hiba gyakran a feldolgozásban van) */
function ical_raw_path($apt, $src) { return ZB_DATA_DIR . '/ical-raw-' . preg_replace('/[^a-z]/', '', $apt) . '-' . preg_replace('/[^a-z]/', '', $src) . '.php'; }
function sync_feed(&$db, $apt, $src, $url, $mock = null) {   /* $mock: tesztekhez kész .ics szöveg (nincs letöltés) */
    if ($mock !== null) { list($code, $body, $err) = array(200, $mock, ''); } else { list($code, $body, $err) = http_get($url); }
    if ($mock === null && ($code !== 200 || strpos($body, 'BEGIN:VCALENDAR') === false)) {   /* egy újrapróbálás (az Airbnb néha elutasítja a szerveroldali kérést) */
        usleep(800000); list($code, $body, $err) = http_get($url, 15);
    }
    if ($code !== 200 || strpos($body, 'BEGIN:VCALENDAR') === false) {
        return array('ok' => false, 'msg' => ($err ? $err : 'Hibás válasz (HTTP ' . $code . ')') . ($src === 'airbnb' && in_array($code, array(403, 429), true) ? ' – az Airbnb elutasította a szerver kérését; a meglévő adatok megmaradtak' : ' – a meglévő adatok megmaradtak'));
    }
    if ($mock === null) @file_put_contents(ical_raw_path($apt, $src), "<?php http_response_code(404); exit; ?>\n" . date('Y-m-d H:i:s') . "\n" . $body);
    $s = $db['settings']; $names = ical_sources(); $today = today(); $seen = array(); $add = 0; $upd = 0; $del = 0; $conf = 0; $keep = 0;
    $events = ical_parse($body);
    /* üresen visszajövő naptár, miközben nálunk még vannak jövőbeli tételei: inkább platformhiba – nem törlünk semmit */
    $had = 0; foreach ($db['bookings'] as $b) { if (isset($b['source'], $b['ext_uid']) && $b['source'] === $src && $b['apt'] === $apt && $b['checkin'] > $today) { $had++; } }
    $fut = 0; foreach ($events as $e) { if ($e['end'] > $today) { $fut++; } }
    $suspicious = $fut === 0 && $had >= 2;
    foreach ($events as $e) {
        if ($e['end'] < $today) { continue; }
        $uid = $src . ':' . $e['uid']; $seen[$uid] = 1; $found = false;
        if (in_array($uid, (array) $s['ext_ignored'], true)) { continue; }   /* tulajdonos törölte, ne jöjjön vissza */
        list($kind, $why) = ical_classify($src, $e); $closed = $kind === 'block' ? 1 : 0;
        $label = $names[$src] . ($closed ? ' – zárt nap' : ($e['summary'] ? ' – ' . $e['summary'] : ''));
        foreach ($db['bookings'] as $i => $b) {
            if (isset($b['ext_uid']) && $b['ext_uid'] === $uid && $b['apt'] === $apt) {
                $found = true; $ci = $e['start'];
                /* „zsugorodó” foglalás: sok platform idővel elhagyja a már elmúlt napokat → a kezdés későbbre ugrik.
                   Ha az új kezdés legfeljebb ma van és később, mint amit eddig láttunk, az a levágás: megtartjuk a korábbit.
                   Ha a jövőben változik, az valódi módosítás – azt átvesszük (így nem ragad be elavult dátum). */
                if ($b['checkin'] < $ci && $ci <= $today && $b['checkin'] < $today) { $ci = $b['checkin']; $db['bookings'][$i]['feed_start'] = $e['start']; }
                else { unset($db['bookings'][$i]['feed_start']); }
                if ($b['checkin'] !== $ci || $b['checkout'] !== $e['end'] || $b['status'] !== 'block') {
                    $db['bookings'][$i]['checkin'] = $ci; $db['bookings'][$i]['checkout'] = $e['end']; $db['bookings'][$i]['status'] = 'block'; $upd++;
                }
                $db['bookings'][$i]['closed'] = $closed; $db['bookings'][$i]['kind'] = $kind; $db['bookings'][$i]['why'] = $why; $db['bookings'][$i]['label'] = $label;
                unset($db['bookings'][$i]['feed_gone']);
                break;
            }
        }
        if ($found) { continue; }
        foreach ($closed ? array() : $db['bookings'] as $b) {  /* ütközés saját foglalással (a platformon zárt nap nem ütközés: azt a tulajdonos maga zárta) */
            if ($b['apt'] === $apt && !is_ext($b) && in_array(eff_status($s, $b), array('pending', 'approved', 'paid'), true) && $b['checkin'] < $e['end'] && $b['checkout'] > $e['start']) {
                $conf++;
                send_mail($s, $s['notify_email'], 'FIGYELEM: foglalási ütközés – ' . $b['ref'],
                    'A(z) ' . $names[$src] . ' naptárában új foglalás jelent meg (' . hu_date($e['start']) . ' – ' . hu_date($e['end']) . "), amely ütközik ezzel a foglalással:\n\n" . summary($s, $b)
                    . "\nA Szállás.hu / Airbnb foglalás az elsődleges, azt itt nem lehet felülírni. Kérjük, az ütköző saját foglalást rendezd (utasítsd el vagy egyeztess a vendéggel).\n");
            }
        }
        $nb = array('id' => bin2hex(random_bytes(8)), 'ref' => new_ref('ZX'), 'apt' => $apt, 'checkin' => $e['start'], 'checkout' => $e['end'],
            'adults' => 0, 'children' => 0, 'name' => '', 'phone' => '', 'email' => '', 'birth_place' => '', 'birth_date' => '', 'id_doc' => '', 'note' => '',
            'total' => 0, 'tax' => 0, 'deposit' => 0, 'created' => time(), 'source' => $src, 'ext_uid' => $uid,
            'label' => $label, 'closed' => $closed, 'kind' => $kind, 'why' => $why, 'admin_note' => '', 'status' => 'block', 'log' => array(), 'ip' => '');
        set_status($nb, 'block', $names[$src] . ' naptárszinkron – ' . $why, 'szinkron');
        $db['bookings'][] = $nb; $add++;
    }
    if (!$suspicious) {
        foreach ($db['bookings'] as $i => $b) {
            if (!isset($b['source'], $b['ext_uid']) || $b['source'] !== $src || $b['apt'] !== $apt || isset($seen[$b['ext_uid']])) { continue; }
            if ($b['checkout'] < $today) { continue; }   /* a múlt marad (napló, vendégnévsor) */
            if ($b['checkin'] <= $today) {
                /* már elkezdődött (bent van vagy ma megy el), de eltűnt a feedből: NEM töröljük – a platform gyakran
                   a távozás napján / a tartózkodás alatt már nem küldi. Jelöljük, és a távozás után magától múlttá válik. */
                if (empty($b['feed_gone'])) { $db['bookings'][$i]['feed_gone'] = $today; $db['bookings'][$i]['log'][] = array('t' => time(), 's' => 'block', 'u' => 'szinkron', 'x' => 'eltűnt a ' . $names[$src] . ' naptárából (folyamatban lévő tartózkodás – megtartva)'); }
                $keep++; continue;
            }
            /* jövőbeli, eltűnt → lemondták: töröljük, de a lomtárba tesszük (gyors visszaállítás) */
            $b['removed_at'] = date('Y-m-d H:i'); $db['ext_removed'][] = $b; unset($db['bookings'][$i]); $del++;
        }
        if (!empty($db['ext_removed'])) { $db['ext_removed'] = array_slice(array_values($db['ext_removed']), -200); }
    }
    $db['bookings'] = array_values($db['bookings']);
    return array('ok' => true, 'msg' => "+$add új · $upd módosult · $del törölve" . ($keep ? " · $keep folyamatban lévő megtartva" : '') . ($conf ? " · $conf ÜTKÖZÉS!" : '') . ($suspicious ? ' · FIGYELEM: üres naptár jött, semmit nem töröltem' : ''));
}
/* Platformok közötti átfedés: ugyanaz az apartman a Szállás.hu-n és az Airbnb-n is szerepel, így egy foglalás kétszer látszik.
   Szabály: ha az egyik oldalon valódi foglalás, a másikon csak blokk („Not available” / zárt nap) – az DUPLIKÁCIÓ (a blokk a foglalás tükre).
   Ha MINDKÉT oldalon valódi foglalás van ugyanarra a napra – az VALÓDI ÜTKÖZÉS (kettős foglalás) → riasztás.
   Elsőbbség (melyik adata az erősebb): Szállás.hu > Airbnb > egyéb naptár. */
function ext_overlaps(&$db) {
    $s = $db['settings']; $names = ical_sources(); $prio = array('szallas' => 0, 'airbnb' => 1, 'egyeb' => 2); $today = today(); $mails = array();
    $ix = array(); foreach ($db['bookings'] as $i => $b) { if (is_ext($b) && $b['checkout'] >= $today) { $ix[] = $i; } unset($db['bookings'][$i]['dup_of'], $db['bookings'][$i]['xconflict']); }
    foreach ($ix as $a) { foreach ($ix as $c) {
        if ($a >= $c) { continue; } $A = $db['bookings'][$a]; $C = $db['bookings'][$c];
        if ($A['apt'] !== $C['apt'] || $A['source'] === $C['source'] || !($A['checkin'] < $C['checkout'] && $A['checkout'] > $C['checkin'])) { continue; }
        $ra = empty($A['closed']); $rc = empty($C['closed']);
        if ($ra && $rc) {
            $txt = $names[$A['source']] . ' ' . hu_date($A['checkin']) . '–' . hu_date($A['checkout']) . ' ↔ ' . $names[$C['source']] . ' ' . hu_date($C['checkin']) . '–' . hu_date($C['checkout']);
            $db['bookings'][$a]['xconflict'] = $txt; $db['bookings'][$c]['xconflict'] = $txt;
            $key = 'x:' . $A['ext_uid'] . '|' . $C['ext_uid'];
            if (empty($db['xconf_mailed'][$key])) { $db['xconf_mailed'][$key] = time(); $mails[] = $txt . ' (' . (isset(apartments($s)[$A['apt']]) ? apartments($s)[$A['apt']]['name'] : $A['apt']) . ')'; }
        } else {
            /* a blokk a másik foglalás tükre → duplikáció, a listákban egyszer jelenik meg (az erősebb platform szerint) */
            if (!$ra && $rc) { $db['bookings'][$a]['dup_of'] = $C['source']; }
            elseif ($ra && !$rc) { $db['bookings'][$c]['dup_of'] = $A['source']; }
            else { $w = (isset($prio[$A['source']]) ? $prio[$A['source']] : 9) <= (isset($prio[$C['source']]) ? $prio[$C['source']] : 9) ? $c : $a; $db['bookings'][$w]['dup_of'] = $db['bookings'][$w === $a ? $c : $a]['source']; }
        }
    } }
    if ($mails) { send_mail($s, $s['notify_email'], 'FIGYELEM: kettős foglalás két platformon', "Ugyanarra a napra két platformon is valódi foglalás érkezett:\n\n- " . implode("\n- ", $mails) . "\n\nKérlek, ellenőrizd a platformokon (a nyers naptárat az admin Naptárszinkron részén is megnézheted).\n"); }
}
function sync_all(&$db) {
    $log = array();
    /* biztonsági pillanatkép minden szinkron előtt (gyors visszaállítás) – az utolsó 10 marad */
    @copy(ZB_DB, ZB_DATA_DIR . '/presync-' . date('Ymd-His') . '.php');
    $old = (array) glob(ZB_DATA_DIR . '/presync-*.php'); sort($old); while (count($old) > 10) { @unlink(array_shift($old)); }
    foreach (apartments($db['settings']) as $apt => $a) {
        $feeds = isset($db['settings']['ical'][$apt]) && is_array($db['settings']['ical'][$apt]) ? $db['settings']['ical'][$apt] : array();
        uksort($feeds, function ($a, $b) { $o = array('szallas' => 0, 'airbnb' => 1, 'egyeb' => 2); return (isset($o[$a]) ? $o[$a] : 9) - (isset($o[$b]) ? $o[$b] : 9); });   /* a Szállás.hu az elsődleges */
        foreach ($feeds as $src => $url) {
            if (!isset(ical_sources()[$src]) || !preg_match('#^https?://#i', (string) $url)) { continue; }
            $r = sync_feed($db, $apt, $src, $url);
            $log[$apt . '|' . $src] = array('t' => date('Y-m-d H:i'), 'ok' => $r['ok'], 'msg' => $r['msg']);
        }
    }
    ext_overlaps($db);
    $db['settings']['sync_log'] = $log; $db['settings']['last_sync'] = time();
    mark_conflicts($db);
    return $log;
}
/* saját foglalás, amely platformról érkezett foglalással ütközik → piros jelzés az adminban */
function mark_conflicts(&$db) {
    $s = $db['settings']; $names = ical_sources(); $ch = false;
    foreach ($db['bookings'] as $i => $b) {   /* régebben szinkronizált tételek: zárt nap jelölés utólag (címke = csak a platform neve vagy általános „nem elérhető”) */
        if (is_ext($b) && !isset($b['closed'])) {
            $sum = isset($b['label']) ? preg_replace('/^' . preg_quote($names[$b['source']], '/') . '\s*(–\s*)?/u', '', $b['label']) : '';
            $cl = ext_closed_sum($sum) ? 1 : 0; $db['bookings'][$i]['closed'] = $cl; if ($cl) { $db['bookings'][$i]['label'] = $names[$b['source']] . ' – zárt nap'; } $ch = true;
        }
    }
    foreach ($db['bookings'] as $i => $b) {
        $c = '';
        if (!is_ext($b) && in_array(eff_status($s, $b), ZB_BLOCKING, true) && $b['checkout'] >= today()) {
            foreach ($db['bookings'] as $x) {
                if (is_ext($x) && empty($x['closed']) && $x['apt'] === $b['apt'] && $x['checkin'] < $b['checkout'] && $x['checkout'] > $b['checkin']) { $c = $names[$x['source']] . ': ' . hu_date($x['checkin']) . ' – ' . hu_date($x['checkout']); break; }
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
        if ($x['id'] !== $b['id'] && is_ext($x) && empty($x['closed']) && $x['apt'] === $b['apt'] && $x['checkin'] < $b['checkout'] && $x['checkout'] > $b['checkin']) { return $names[$x['source']] . ' foglalás (' . hu_date($x['checkin']) . ' – ' . hu_date($x['checkout']) . ')'; }
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
        if ($for && !empty($b['dup_of']) && $b['dup_of'] === $for) { continue; }   /* a platform saját foglalásának tükrét (pl. az Airbnb „Not available” blokkját) sem küldjük vissza neki – különben önmagával ütközne */
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
function send_mail($s, $to, $subject, $body, $html = '') {
    if (defined('ZB_TEST')) { $GLOBALS['ZB_MAILS'][] = $subject; $GLOBALS['ZB_BODIES'][] = $body; $GLOBALS['ZB_HTMLS'][] = $html; return true; }
    if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL)) { return false; }
    $host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^a-z0-9.-]/i', '', $_SERVER['HTTP_HOST']) : 'balatoni-udules.hu';
    $host = preg_replace('/^www\./', '', $host);
    $from = 'foglalas@' . $host;
    $headers = 'From: =?UTF-8?B?' . base64_encode('Zephyr Apartmanház') . "?= <{$from}>\r\n"
        . ($s['email'] ? "Reply-To: {$s['email']}\r\n" : '')
        . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n";
    $subj = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    if ($html) {   /* szép HTML + sima szöveg együtt: a levelező a neki valót mutatja */
        $bd = 'zb' . bin2hex(random_bytes(8));
        $headers = preg_replace('/Content-Type: text\/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n/', "Content-Type: multipart/alternative; boundary=\"{$bd}\"\r\n", $headers);
        $msg = "--{$bd}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($body))
            . "--{$bd}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "--{$bd}--\r\n";
        return @mail($to, $subj, $msg, $headers, '-f' . $from);
    }
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
/* ---------------------------------------------------------------- HTML-levelek (Zephyr Nautical Horizon, 2026. nov. 9.)
   A vendég szép, „hajójegy” stílusú levelet kap; mellette mindig ott a sima szöveges változat (multipart/alternative),
   így minden levelezőben olvasható. Csak táblázatos elrendezés és beágyazott stílus – a levelezők így jelenítik meg megbízhatóan. */
function eh($t) { return htmlspecialchars((string) $t, ENT_QUOTES, 'UTF-8'); }
function email_html($s, $b, $o) {
    $aps = apartments($s); $apt = isset($aps[$b['apt']]) ? $aps[$b['apt']]['name'] : $b['apt']; $no = isset($aps[$b['apt']]['no']) ? $aps[$b['apt']]['no'] : '';
    $st = array('wait' => array('#FFF4D6', '#8A5D0C', 'Jóváhagyásra vár'), 'pay' => array('#FFF4D6', '#8A5D0C', 'Jóváhagyva – előlegre vár'),
        'ok' => array('#E3F5EA', '#1D7446', 'Visszaigazolva'), 'no' => array('#FDE7E7', '#9B1C1C', 'Nem tudtuk elfogadni'), 'del' => array('#FDE7E7', '#9B1C1C', 'Törölve'));
    $c = $st[$o['state']];
    $nn = nights($b['checkin'], $b['checkout']);
    $guests = (int) $b['adults'] . ' felnőtt' . ((int) $b['children'] ? ', ' . (int) $b['children'] . ' gyermek' : '');
    $row = function ($k, $v, $strong = false) { return '<tr><td style="padding:7px 0;color:#5B6B7C;font-size:15px;">' . eh($k) . '</td><td style="padding:7px 0;text-align:right;color:#07182C;font-size:16px;' . ($strong ? 'font-weight:800;' : 'font-weight:600;') . '">' . eh($v) . '</td></tr>'; };
    $tulip = '<span style="font-size:28px;color:#D4A13A;">&#10047;</span>';   /* virágmotívum – szövegként, mert a Gmail az SVG-t kiszűri */
    $h = '<!DOCTYPE html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . eh($o['title']) . '</title></head>'
        . '<body style="margin:0;padding:0;background:#EEF2F7;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">'
        . '<div style="display:none;max-height:0;overflow:hidden;">' . eh($o['pre']) . '</div>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2F7;"><tr><td align="center" style="padding:24px 12px;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(11,47,94,.12);">'
        /* fejléc */
        . '<tr><td style="background:#0B2F5E;padding:22px 28px;border-bottom:4px solid #D4A13A;"><table role="presentation" width="100%"><tr>'
        . '<td style="color:#FFFFFF;"><div style="font-size:24px;font-weight:800;letter-spacing:5px;color:#E4BB63;">ZEPHYR</div><div style="font-size:12px;letter-spacing:3px;color:#DDE8F2;">APARTMANHÁZ · ZAMÁRDI · BALATON</div></td>'
        . '<td align="right" style="font-size:30px;color:#E4BB63;">&#9973;</td></tr></table></td></tr>'
        /* cím + állapot */
        . '<tr><td style="padding:28px 28px 8px;"><div style="display:inline-block;padding:7px 14px;border-radius:999px;background:' . $c[0] . ';color:' . $c[1] . ';font-size:14px;font-weight:700;">' . eh($c[2]) . '</div>'
        . '<h1 style="margin:14px 0 6px;font-size:26px;line-height:1.25;color:#0B2F5E;">' . eh($o['title']) . '</h1>'
        . '<p style="margin:0 0 6px;font-size:17px;line-height:1.55;color:#22313F;">Kedves ' . eh($b['name']) . '!</p>'
        . '<p style="margin:0;font-size:17px;line-height:1.55;color:#22313F;">' . $o['lead'] . '</p></td></tr>'
        /* hajójegy */
        . '<tr><td style="padding:18px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #D4A13A;border-radius:16px;background:#F7F9FC;">'
        . '<tr><td style="padding:14px 18px;border-bottom:2px dashed #D9C9A0;"><table role="presentation" width="100%"><tr><td><div style="font-size:12px;letter-spacing:3px;color:#8A5D0C;font-weight:700;">HAJÓJEGY · ' . eh($b['ref']) . '</div>'
        . '<div style="font-size:22px;font-weight:800;color:#0B2F5E;margin-top:4px;">' . eh(($no ? $no . ' · ' : '') . $apt) . ' apartman</div></td><td align="right">' . $tulip . '</td></tr></table></td></tr>'
        . '<tr><td style="padding:14px 18px;"><table role="presentation" width="100%"><tr>'
        . '<td width="50%" style="vertical-align:top;"><div style="font-size:12px;letter-spacing:2px;color:#5B6B7C;">ÉRKEZÉS</div><div style="font-size:18px;font-weight:800;color:#07182C;">' . eh(hu_date($b['checkin'])) . '</div><div style="font-size:14px;color:#5B6B7C;">' . eh($s['checkin']) . '-tól</div></td>'
        . '<td width="50%" style="vertical-align:top;text-align:right;"><div style="font-size:12px;letter-spacing:2px;color:#5B6B7C;">TÁVOZÁS</div><div style="font-size:18px;font-weight:800;color:#07182C;">' . eh(hu_date($b['checkout'])) . '</div><div style="font-size:14px;color:#5B6B7C;">' . eh($s['checkout']) . '-ig</div></td>'
        . '</tr></table><table role="presentation" width="100%" style="margin-top:10px;border-top:1px solid #E1E8F0;">'
        . $row('Éjszakák', $nn . ' éj') . $row('Vendégek', $guests)
        . (!empty($b['group']) ? $row('Csoportos foglalás', $b['group'] . ' (' . (int) $b['group_size'] . ' apartman)') : '')
        . (!empty($b['discount']) ? $row('Stégjáték-kedvezmény (' . (int) $b['discount_pct'] . '%)', '−' . money($b['discount'])) : '')
        . $row('Végösszeg (idegenforgalmi adóval)', money($b['total']), true) . $row('Előleg', money($b['deposit']))
        . (isset($o['due']) ? $row('Érkezéskor fizetendő', money($o['due']), true) : '')
        . '</table></td></tr></table></td></tr>'
        . (!empty($o['extra']) ? '<tr><td style="padding:4px 28px 8px;">' . $o['extra'] . '</td></tr>' : '')
        /* tudnivalók */
        . '<tr><td style="padding:10px 28px 22px;"><table role="presentation" width="100%" style="background:#EAF0F6;border-radius:14px;"><tr><td style="padding:14px 18px;font-size:15px;line-height:1.6;color:#22313F;">'
        . '&#128337; Érkezés ' . eh($s['checkin']) . '-tól, távozás ' . eh($s['checkout']) . '-ig<br>&#128179; SZÉP-kártyát is elfogadunk<br>&#9875; Saját napozóstég, ingyenes SUP és kerékpár</td></tr></table></td></tr>'
        /* lábléc */
        . '<tr><td style="background:#07182C;padding:20px 28px;color:#DDE8F2;font-size:14px;line-height:1.6;">'
        . '<b style="color:#E4BB63;">Zephyr Apartmanház</b><br>' . eh($s['address']) . '<br>Tel.: <a href="tel:' . eh(preg_replace('/[^+0-9]/', '', $s['phone'])) . '" style="color:#FFFFFF;">' . eh($s['phone']) . '</a> · <a href="mailto:' . eh($s['email']) . '" style="color:#FFFFFF;">' . eh($s['email']) . '</a>'
        . ($s['ntak'] ? '<br><span style="color:#8FA3B8;font-size:12px;">NTAK regisztrációs szám: ' . eh($s['ntak']) . '</span>' : '') . '</td></tr>'
        . '</table></td></tr></table></body></html>';
    return $h;
}
function pay_html($s, $b, $deadline) {
    $box = function ($t, $body) { return '<table role="presentation" width="100%" style="margin:8px 0;border:1px solid #E1E8F0;border-radius:12px;"><tr><td style="padding:12px 16px;font-size:15px;line-height:1.6;color:#22313F;"><div style="font-size:12px;letter-spacing:2px;font-weight:700;color:#0B2F5E;margin-bottom:4px;">' . $t . '</div>' . $body . '</td></tr></table>'; };
    $h = '<div style="font-size:17px;font-weight:800;color:#0B2F5E;margin:6px 0;">Előleg: ' . eh(money($b['deposit'])) . ' · határidő: ' . eh(rtrim($deadline, '.')) . '</div>'
        . '<div style="font-size:15px;color:#22313F;margin-bottom:6px;">Közlemény: <b>' . eh($b['ref']) . '</b></div>';
    if ($s['bank_holder'] || $s['bank_account']) { $h .= $box('BELFÖLDI ÁTUTALÁS', 'Kedvezményezett: <b>' . eh($s['bank_holder']) . '</b>' . ($s['bank_name'] ? '<br>Bank: ' . eh($s['bank_name']) : '') . ($s['bank_account'] ? '<br>Számlaszám: <b>' . eh($s['bank_account']) . '</b>' : '')); }
    if ($s['bank_iban']) { $h .= $box('KÜLFÖLDI ÁTUTALÁS / INTERNATIONAL', 'IBAN: <b>' . eh($s['bank_iban']) . '</b>' . ($s['bank_swift'] ? '<br>SWIFT/BIC: ' . eh($s['bank_swift']) : '') . '<br>Reference: ' . eh($b['ref'])); }
    $sz = szep_list($s);
    if ($sz) { $t = 'Az előleget SZÉP-kártyáról is elutalhatja a kibocsátó online felületén, vagy érkezéskor a helyszínen is fizethet vele:'; foreach ($sz as $x) { $t .= '<br>– ' . eh($x[0]) . ': ' . eh($x[1]) . ' <b>' . eh($x[2]) . '</b>'; } $h .= $box('SZÉP-KÁRTYA (szállás alszámla)', $t); }
    return $h;
}
function mail_received($s, $b) {
    send_mail($s, $b['email'], 'Foglalási kérés megérkezett – ' . $b['ref'] . ' – Zephyr Apartmanház',
        "Kedves {$b['name']}!\n\nKöszönjük foglalási kérését, megkaptuk. A kiválasztott napokat ideiglenesen lefoglaltuk.\n"
        . "Hamarosan ellenőrizzük, és jóváhagyás után e-mailben küldjük az előleg átutalásához szükséges adatokat. A foglalás az előleg beérkezésével válik véglegessé.\n\n"
        . summary($s, $b) . footer($s),
        email_html($s, $b, array('state' => 'wait', 'title' => 'Foglalási kérelmét megkaptuk!', 'pre' => 'A napokat ideiglenesen lefoglaltuk – hamarosan jelentkezünk.',
            'lead' => 'Köszönjük, hogy a Zephyr Apartmanházat választotta. A kiválasztott napokat ideiglenesen lefoglaltuk. A kérést hamarosan ellenőrizzük, és jóváhagyás után e-mailben küldjük az előleg utalásához szükséges adatokat. <b>A foglalás az előleg beérkezésével válik véglegessé.</b>')));
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
        . "A foglalás véglegesítéséhez kérjük, utalja át az előleget " . rtrim($deadline, ".") . "-ig az alábbi adatokkal:\n\n"
        . 'Összeg: ' . money($b['deposit']) . "\nKözlemény: {$b['ref']}\n\n" . pay_text($s, $b) . "\n"
        . "Az előleg beérkezése után visszaigazoló e-mailt küldünk. A fennmaradó összeget érkezéskor kell rendezni" . (szep_list($s) ? ' (SZÉP-kártyát is elfogadunk)' : '') . ".\n\n"
        . summary($s, $b) . footer($s),
        email_html($s, $b, array('state' => 'pay', 'title' => 'Örömmel jóváhagytuk foglalását!', 'pre' => 'Az előleg utalásával a foglalás végleges lesz.',
            'lead' => 'Foglalási kérését jóváhagytuk. A véglegesítéshez kérjük, utalja át az előleget az alábbi adatokkal. Az előleg beérkezése után visszaigazoló levelet küldünk; a fennmaradó összeget érkezéskor kell rendezni.',
            'extra' => pay_html($s, $b, $deadline))));
}
function mail_paid($s, $b) {
    return send_mail($s, $b['email'], 'Foglalás visszaigazolva – ' . $b['ref'] . ' – Zephyr Apartmanház',
        "Kedves {$b['name']}!\n\nAz előleget megkaptuk, foglalása ezzel végleges. Szeretettel várjuk!\n\n"
        . summary($s, $b) . 'Érkezéskor fizetendő: ' . money(max(0, (int) $b['total'] - (int) $b['deposit'])) . "\n" . footer($s),
        email_html($s, $b, array('state' => 'ok', 'title' => 'Foglalása végleges – szeretettel várjuk!', 'pre' => 'Az előleget megkaptuk. Jó készülődést a Balatonra!',
            'lead' => 'Az előleget megkaptuk, foglalása ezzel végleges. Szeretettel várjuk Zamárdiban! Ha bármi kérdése van az érkezés előtt, írjon vagy hívjon bátran.', 'due' => max(0, (int) $b['total'] - (int) $b['deposit']))));
}
function mail_rejected($s, $b, $reason) {
    send_mail($s, $b['email'], 'Foglalási kérés – ' . $b['ref'] . ' – Zephyr Apartmanház',
        "Kedves {$b['name']}!\n\nSajnálattal értesítjük, hogy a kért időszakra nem tudjuk elfogadni foglalását.\n"
        . ($reason ? "\n{$reason}\n" : '') . "\nHa más időpont is megfelelne, szívesen segítünk.\n\n" . summary($s, $b) . footer($s),
        email_html($s, $b, array('state' => 'no', 'title' => 'Sajnos erre az időszakra nem tudjuk fogadni', 'pre' => 'Ha más időpont is megfelelne, szívesen segítünk.',
            'lead' => 'Sajnálattal értesítjük, hogy a kért időszakra nem tudjuk elfogadni foglalását.' . ($reason ? '<br><br>' . nl2br(eh($reason)) : '') . '<br><br>Ha más időpont is megfelelne, szívesen segítünk – válaszoljon erre a levélre.')));
}
function mail_cancelled($s, $b, $reason) {
    send_mail($s, $b['email'], 'Foglalás törölve – ' . $b['ref'] . ' – Zephyr Apartmanház',
        "Kedves {$b['name']}!\n\nFoglalását töröltük.\n" . ($reason ? "\n{$reason}\n" : '') . "\n" . summary($s, $b) . footer($s),
        email_html($s, $b, array('state' => 'del', 'title' => 'Foglalását töröltük', 'pre' => 'A foglalás törlésének részletei.',
            'lead' => 'Foglalását töröltük.' . ($reason ? '<br><br>' . nl2br(eh($reason)) : '') . '<br><br>Kérdés esetén keressen minket bizalommal.')));
}

/* ---------------------------------------------------------------- vendég-programajánló (érkezés előtti levél, távolság szerint) */
/* település => [szélesség, hosszúság, part (d = déli, e = északi)]; a ház Zamárdiban van */
const EV_GEO = array(
    'Zamárdi' => array(46.8853, 17.9539, 'd'), 'Szántód' => array(46.8660, 17.9100, 'd'), 'Balatonföldvár' => array(46.8519, 17.8822, 'd'), 'Kőröshegy' => array(46.8333, 17.9000, 'd'),
    'Siófok' => array(46.9041, 18.0580, 'd'), 'Balatonszárszó' => array(46.8290, 17.8250, 'd'), 'Balatonszemes' => array(46.8100, 17.7700, 'd'), 'Balatonlelle' => array(46.7850, 17.6950, 'd'),
    'Balatonboglár' => array(46.7750, 17.6550, 'd'), 'Fonyód' => array(46.7430, 17.5530, 'd'), 'Balatonvilágos' => array(46.9700, 18.1650, 'd'), 'Balatonkenese' => array(47.0400, 18.1060, 'e'),
    'Balatonmáriafürdő' => array(46.7000, 17.3900, 'd'), 'Balatonkeresztúr' => array(46.6950, 17.3700, 'd'),
    'Tihany' => array(46.9140, 17.8890, 'e'), 'Balatonfüred' => array(46.9590, 17.8890, 'e'), 'Csopak' => array(46.9770, 17.9200, 'e'), 'Paloznak' => array(46.9850, 17.9400, 'e'),
    'Balatonalmádi' => array(47.0300, 18.0150, 'e'), 'Révfülöp' => array(46.8260, 17.6200, 'e'), 'Badacsony' => array(46.7960, 17.5100, 'e'), 'Szigliget' => array(46.8000, 17.4330, 'e'),
    'Keszthely' => array(46.7680, 17.2430, 'e'), 'Hévíz' => array(46.7900, 17.1860, 'e'), 'Vonyarcvashegy' => array(46.7600, 17.3100, 'e'));
/* az északi part felé: melyik hajó/komp visz át (a menetrendet a BAHART oldalán kell nézni – szezononként változik) */
const EV_CROSS = array(
    'Tihany' => 'Komp: Szántódrév – Tihanyrév (a háztól kb. 5 km, egész évben jár; biciklit is visz)',
    'Balatonfüred' => 'Hajó: Siófok – Balatonfüred (szezonban), autóval a szántódi komppal', 'Csopak' => 'Hajó Balatonfüredig, vagy a szántódi komppal',
    'Paloznak' => 'Hajó Balatonfüredig, vagy a szántódi komppal', 'Révfülöp' => 'Hajó: Balatonboglár – Révfülöp (szezonban)', 'Badacsony' => 'Hajó: Fonyód – Badacsony (szezonban)');
const EV_ZONES = array('gyalog' => 'Gyalog is elérhető (Zamárdiban)', 'bicikli' => 'Biciklivel is elérhető', 'hajo' => 'Hajóval vagy komppal, az északi parton', 'auto' => 'Autóval', 'egyeb' => 'További programok');
const EV_ZONE_SHORT = array('gyalog' => 'Gyalog', 'bicikli' => 'Biciklivel', 'hajo' => 'Hajóval, komppal', 'auto' => 'Autóval', 'egyeb' => 'Egyéb');
const EV_CAT_HU = array('fesztival' => 'Fesztivál', 'koncert' => 'Koncert', 'sport' => 'Sport', 'gasztro' => 'Gasztro', 'kultura' => 'Kultúra', 'csalad' => 'Családi', 'egyeb' => 'Egyéb');
function ev_km($town) {
    if (!isset(EV_GEO[$town])) { return null; }
    list($a, $b) = EV_GEO['Zamárdi']; list($c, $d) = EV_GEO[$town];
    $r = 6371 * 2 * asin(sqrt(pow(sin(deg2rad($c - $a) / 2), 2) + cos(deg2rad($a)) * cos(deg2rad($c)) * pow(sin(deg2rad($d - $b) / 2), 2)));
    return (int) round($r * 1.25);   /* légvonal × közúti szorzó – tájékoztató érték */
}
/* egy program elhelyezése: zóna, km, biciklivel elérhető-e, átkelés, útvonal-linkek (Google Térkép – ingyenes, kulcs nélkül) */
function ev_where($s, $e) {
    $town = isset($e['town']) && $e['town'] !== '' ? $e['town'] : ev_guess_town((isset($e['place']) ? $e['place'] : '') . ' ' . $e['title'], '');
    $km = ev_km($town); $bk = max(5, (int) $s['guest_ev_bike_km']);
    if ($km === null) { $zone = 'egyeb'; }
    elseif ($km <= 3) { $zone = 'gyalog'; }
    elseif (isset(EV_CROSS[$town])) { $zone = 'hajo'; }
    elseif (EV_GEO[$town][2] === 'd' && $km <= $bk) { $zone = 'bicikli'; }
    else { $zone = 'auto'; }
    $bike = $zone === 'gyalog' || $zone === 'bicikli' || ($town === 'Tihany');   /* Tihany: komppal, biciklivel is */
    $dest = trim((isset($e['place']) && $e['place'] !== '' ? $e['place'] . ', ' : '') . ($town !== '' ? $town : 'Balaton'));
    $u = function ($mode) use ($s, $dest) { return 'https://www.google.com/maps/dir/?api=1&origin=' . rawurlencode($s['address']) . '&destination=' . rawurlencode($dest) . '&travelmode=' . $mode; };
    $r = array('zone' => $zone, 'km' => $km, 'town' => $town, 'bike' => $bike ? 1 : 0, 'cross' => isset(EV_CROSS[$town]) ? EV_CROSS[$town] : '',
        'map' => $u($zone === 'gyalog' ? 'walking' : 'driving'));
    if ($bike && $zone !== 'gyalog') { $r['map_bike'] = $u('bicycling'); }
    if ($zone === 'hajo') { $r['map_transit'] = $u('transit'); $r['ferry'] = $s['ferry_url']; }
    return $r;
}
/* a vendég ott-tartózkodása alatti programok (érkezés napjától távozás napjáig), zónák szerint */
function guest_events($db, $b) {
    $s = $db['settings']; $o = array(); $seen = array();
    foreach ((array) (isset($db['events']) ? $db['events'] : array()) as $e) {
        if (!empty($e['hidden']) || !empty($e['gone'])) { continue; }
        $to = isset($e['to']) && $e['to'] ? $e['to'] : $e['from'];
        if ($to < $b['checkin'] || $e['from'] > $b['checkout']) { continue; }
        $k = ev_key($e); if (isset($seen[$k])) { continue; } $seen[$k] = 1;
        $e['where'] = ev_where($s, $e); $o[] = $e;
    }
    $zo = array_flip(array_keys(EV_ZONES));
    usort($o, function ($a, $c) use ($zo) { $x = $zo[$a['where']['zone']] - $zo[$c['where']['zone']]; return $x ? $x : strcmp($a['from'] . $a['time'], $c['from'] . $c['time']); });
    return $o;
}
function guest_key($b) { return substr(hash_hmac('sha256', 'prog|' . $b['id'], ZB_INITIAL_HASH . '|' . ZB_DB), 0, 20); }
function guest_link($b, $extra = '') { return api_self_url() . '?r=vendeg_programok&b=' . rawurlencode($b['id']) . '&k=' . guest_key($b) . $extra; }
function ev_when($e) {
    $to = isset($e['to']) && $e['to'] ? $e['to'] : '';
    return hu_date($e['from']) . ($to ? ' – ' . hu_date($to) : '') . ($e['time'] ? ', ' . $e['time'] : '');
}
function mail_guest_programs($db, $b, $to = '') {
    $s = $db['settings']; $evs = guest_events($db, $b);
    if (!$evs) { return array(false, 'Az ott-tartózkodás idejére nincs felvett program.'); }
    $t = "Kedves {$b['name']}!\n\nHamarosan találkozunk! Szeretettel várunk a Zephyr Apartmanházban.\nÉrkezés: " . hu_day($b['checkin']) . ', ' . hu_date($b['checkin']) . ", {$s['checkin']}-tól\n"
        . "Összegyűjtöttük, mi lesz a környéken, amíg nálunk vagy – távolság szerint, útvonaltervvel. Jó szórakozást!\n";
    $zone = ''; $n = 0;
    foreach ($evs as $e) {
        $w = $e['where'];
        if ($w['zone'] !== $zone) { $zone = $w['zone']; $t .= "\n" . mb_strtoupper(EV_ZONES[$zone]) . "\n" . str_repeat('-', 30) . "\n"; }
        if (++$n > 25) { continue; }
        $t .= '• ' . $e['title'] . ' (' . EV_CAT_HU[$e['cat']] . ")\n  " . ev_when($e) . "\n  " . trim(($e['place'] ? $e['place'] . ', ' : '') . $w['town'], ', ')
            . ($w['km'] ? ' – kb. ' . $w['km'] . ' km' : '') . ($e['free'] ? ' – ingyenes' : ($e['price'] ? ' – ' . $e['price'] : '')) . "\n"
            . ($w['cross'] ? '  ' . $w['cross'] . "\n" : '')
            . '  Útvonal: ' . $w['map'] . "\n" . (isset($w['map_bike']) ? '  Biciklivel: ' . $w['map_bike'] . "\n" : '')
            . ($e['url'] ? '  Részletek: ' . $e['url'] . "\n" : '');
    }
    if ($n > 25) { $t .= "\n…és még " . ($n - 25) . " program a lenti linken.\n"; }
    if (array_filter($evs, function ($e) { return $e['where']['zone'] === 'hajo'; })) { $t .= "\nHajó- és kompmenetrend: {$s['ferry_url']}\n"; }
    $t .= "\nAz összes program térképes útvonallal, telefonon is kényelmesen:\n" . guest_link($b) . "\n"
        . "\nA programok időpontját a szervezők módosíthatják, indulás előtt érdemes rápillantani a rendezvény oldalára.\n"
        . "Ha bármiben segíthetünk, írj vagy hívj nyugodtan!\n" . footer($s)
        . "\nHa nem kérsz több programajánlót: " . guest_link($b, '&leiratkozas=1') . "\n";
    $ok = send_mail($s, $to ? $to : $b['email'], 'Programok az ittlétedre – ' . hu_date($b['checkin']) . ' – Zephyr Apartmanház', $t);
    return array($ok, $ok ? count($evs) . ' program elküldve ide: ' . ($to ? $to : $b['email']) : 'A szerver nem tudta elküldeni az e-mailt.');
}
/* naponta: aki a következő X napon belül érkezik, visszaigazolt, van e-mail címe és még nem kapott – annak megy a levél */
function guest_ev_run(&$db) {
    $s = $db['settings']; $log = array();
    if (empty($s['guest_ev'])) { return $log; }
    $lim = add_days(today(), max(1, (int) $s['guest_ev_days']));
    foreach ($db['bookings'] as $i => $b) {
        $st = eff_status($s, $b);
        if (!in_array($st, array('paid', 'approved'), true) || ($st === 'approved' && empty($s['guest_ev_approved']))) { continue; }
        if (empty($b['email']) || !empty($b['ev_sent']) || !empty($b['ev_optout']) || $b['checkin'] <= today() || $b['checkin'] > $lim) { continue; }
        if (!empty($b['group']) && guest_group_done($db, $b)) { $db['bookings'][$i]['ev_sent'] = today(); continue; }
        list($ok, $msg) = mail_guest_programs($db, $b);
        if ($ok) { $db['bookings'][$i]['ev_sent'] = today(); $db['bookings'][$i]['log'][] = array('t' => time(), 's' => $b['status'], 'u' => 'rendszer', 'x' => 'Programlevél elküldve'); }   /* ha még nincs program, holnap újra megnézi */
        $log[] = $b['ref'] . ': ' . $msg;
    }
    return $log;
}
/* csoportos foglalásnál egy vendég (ugyanaz az e-mail) csak egy levelet kap */
function guest_group_done($db, $b) {
    foreach ($db['bookings'] as $x) { if ($x['id'] !== $b['id'] && !empty($x['group']) && $x['group'] === $b['group'] && !empty($x['ev_sent']) && $x['email'] === $b['email']) { return true; } }
    return false;
}
function guest_ev_due($db) { return !empty($db['settings']['guest_ev']) && (int) date('G') >= 9 && (!isset($db['guest_ev_day']) || $db['guest_ev_day'] !== today()); }
/* a vendég saját programoldala (a levélben lévő linkről) */
function guest_page($db, $b, $optout) {
    $s = $db['settings']; $h = function ($v) { return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8'); };
    $evs = $optout ? array() : guest_events($db, $b); $cnt = array();
    foreach ($evs as $e) { $z = $e['where']['zone']; $cnt[$z] = isset($cnt[$z]) ? $cnt[$z] + 1 : 1; }
    $o = '<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'
        . '<title>Programok az ittlétedre – Zephyr Apartmanház</title><style>'
        . ':root{--sea:#0b2f5e;--red:#e2483d;--rope:#c99a4a;--ink:#14202a;--ink2:#56636e;--line:#e6dcc8;--cream:#f5efe2}*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif}'
        . 'header{background:linear-gradient(135deg,#0b2f5e,#1b4c86);color:#fff;padding:22px 16px 30px;position:relative}header::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:10px;background:radial-gradient(circle at 10px -4px,transparent 12px,var(--cream) 13px) 0 0/20px 10px repeat-x}'
        . '.w{max-width:760px;margin:0 auto}h1{margin:4px 0 2px;font-size:26px;letter-spacing:.02em}header small{color:#ffd978;font-weight:800;letter-spacing:.16em;text-transform:uppercase;font-size:11.5px}header p{margin:6px 0 0;opacity:.88}'
        . 'main{padding:18px 16px 40px}.chips{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}.chips button{all:unset;cursor:pointer;padding:9px 13px;border-radius:99px;background:#fff;border:1.5px solid var(--line);font-weight:800;font-size:13.5px;color:var(--sea)}.chips button.on{background:var(--sea);color:#fff;border-color:var(--sea)}'
        . 'h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--red);margin:26px 0 10px;display:flex;gap:8px;align-items:center}h2::after{content:"";flex:1;height:1px;background:var(--line)}'
        . '.ev{background:#fff;border-radius:16px;padding:14px 16px;margin:0 0 12px;box-shadow:0 2px 0 var(--line),0 10px 24px rgba(20,32,42,.06)}.ev b{font-size:17px;display:block;line-height:1.25}.m{color:var(--ink2);font-size:14px;margin-top:4px}'
        . '.tg{display:inline-block;font-size:11.5px;font-weight:800;padding:2px 8px;border-radius:99px;background:#eef3f8;color:var(--sea);margin-right:6px}.tg.f{background:#e7f6ec;color:#1f7a45}.x{font-size:13.5px;color:#7a5a1e;background:#fbf4e4;border-radius:10px;padding:7px 10px;margin-top:8px}'
        . '.a{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.a a{text-decoration:none;font-weight:800;font-size:13.5px;padding:8px 12px;border-radius:10px;background:var(--sea);color:#fff}.a a.l{background:#fff;color:var(--sea);border:1.5px solid var(--line)}'
        . '.empty{background:#fff;border-radius:16px;padding:24px;text-align:center;color:var(--ink2)}footer{color:var(--ink2);font-size:13px;text-align:center;padding:10px 16px 30px}footer a{color:var(--sea)}[hidden]{display:none!important}</style></head><body>'
        . '<header><div class="w"><small>Zephyr Apartmanház · Zamárdi</small><h1>Programok az ittlétedre</h1><p>' . $h(hu_date($b['checkin'])) . ' – ' . $h(hu_date($b['checkout'])) . ' · távolság szerint, útvonaltervvel</p></div></header><main class="w">';
    if ($optout) {
        $o .= '<div class="empty"><b>Leiratkoztál.</b><br>Erre a foglalásra nem küldünk több programajánlót. Szeretettel várunk!</div>';
    } elseif (!$evs) {
        $o .= '<div class="empty">Erre az időszakra még nincs felvett program. Érkezéskor szívesen ajánlunk helyben is!</div>';
    } else {
        $o .= '<div class="chips"><button class="on" data-z="">Mind (' . count($evs) . ')</button>';
        foreach (EV_ZONES as $z => $nm) { if (!empty($cnt[$z])) { $o .= '<button data-z="' . $z . '">' . $h(EV_ZONE_SHORT[$z]) . ' (' . $cnt[$z] . ')</button>'; } }
        $o .= '<button data-z="bike">🚲 Minden, ami biciklivel elérhető</button></div>';
        $zone = '';
        foreach ($evs as $e) {
            $w = $e['where'];
            if ($w['zone'] !== $zone) { $zone = $w['zone']; $o .= '<h2 data-zh="' . $zone . '">' . $h(EV_ZONES[$zone]) . '</h2>'; }
            $o .= '<div class="ev" data-zone="' . $zone . '" data-bike="' . $w['bike'] . '"><span class="tg">' . $h(EV_CAT_HU[$e['cat']]) . '</span>' . ($e['free'] ? '<span class="tg f">Ingyenes</span>' : '') . ($e['kids'] ? '<span class="tg">Gyerekbarát</span>' : '')
                . '<b>' . $h($e['title']) . '</b><div class="m">' . $h(ev_when($e)) . '<br>' . $h(trim(($e['place'] ? $e['place'] . ', ' : '') . $w['town'], ', ')) . ($w['km'] ? ' · kb. ' . $w['km'] . ' km' : '') . (!$e['free'] && $e['price'] ? ' · ' . $h($e['price']) : '') . '</div>'
                . ($w['cross'] ? '<div class="x">⛴ ' . $h($w['cross']) . '</div>' : '')
                . '<div class="a"><a href="' . $h($w['map']) . '" target="_blank" rel="noopener">Útvonal ' . ($w['zone'] === 'gyalog' ? 'gyalog' : 'autóval') . '</a>'
                . (isset($w['map_bike']) ? '<a class="l" href="' . $h($w['map_bike']) . '" target="_blank" rel="noopener">🚲 Biciklivel</a>' : '')
                . (isset($w['map_transit']) ? '<a class="l" href="' . $h($w['map_transit']) . '" target="_blank" rel="noopener">Tömegközlekedéssel</a><a class="l" href="' . $h($w['ferry']) . '" target="_blank" rel="noopener">⛴ Menetrend</a>' : '')
                . ($e['url'] ? '<a class="l" href="' . $h($e['url']) . '" target="_blank" rel="noopener">Részletek ↗</a>' : '') . '</div></div>';
        }
        $o .= '<script>document.querySelector(".chips").addEventListener("click",function(ev){var b=ev.target.closest("button");if(!b)return;var z=b.dataset.z;[].forEach.call(document.querySelectorAll(".chips button"),function(x){x.classList.toggle("on",x===b)});'
            . '[].forEach.call(document.querySelectorAll(".ev"),function(e){e.hidden=!(z===""||(z==="bike"?e.dataset.bike==="1":e.dataset.zone===z))});[].forEach.call(document.querySelectorAll("h2[data-zh]"),function(h){h.hidden=!document.querySelector(\'.ev[data-zone="\'+h.dataset.zh+\'"]:not([hidden])\')})});</script>';
    }
    $o .= '</main><footer>A távolságok tájékoztató jellegűek, a programok időpontját a szervezők módosíthatják.<br>Zephyr Apartmanház · ' . $h($s['address']) . ' · <a href="tel:' . $h(preg_replace('/\s+/', '', $s['phone'])) . '">' . $h($s['phone']) . '</a>'
        . ($optout ? '' : '<br><a href="' . $h(guest_link($b, '&leiratkozas=1')) . '">Nem kérek több programajánlót</a>') . '</footer></body></html>';
    return $o;
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
            'note' => clean(isset($t['note']) ? $t['note'] : '', 160), 'color' => $col, 'active' => !isset($t['active']) || $t['active'] ? 1 : 0,
            'auto' => isset($t['auto']) && in_array($t['auto'], array('mixed', 'selective', 'green', 'bulky'), true) ? $t['auto'] : '');
    }
    return $o;
}
/* ---------------------------------------------------------------- hulladéknaptár: automatikus letöltés a Siókom oldaláról (évente, PDF-ből) */
/* egyszerű PDF-szövegkiolvasó: oldalanként [oldal, x, y, betűméret, szöveg] – Identity-H/ToUnicode és WinAnsi betűkészletekhez */
function pdf_objects($raw) {
    $o = array();
    if (preg_match_all('/(\d+)\s+0\s+obj\b/', $raw, $m, PREG_OFFSET_CAPTURE)) {
        foreach ($m[1] as $i => $hit) { $st = $m[0][$i][1] + strlen($m[0][$i][0]); $en = strpos($raw, 'endobj', $st); if ($en === false) { continue; } $o[(int) $hit[0]] = substr($raw, $st, $en - $st); }
    }
    return $o;
}
function pdf_stream($obj) {
    $p = strpos($obj, 'stream'); if ($p === false) { return null; }
    $dict = substr($obj, 0, $p); $s = $p + 6; if ($obj[$s] === "\r") { $s++; } if ($obj[$s] === "\n") { $s++; }
    $e = strrpos($obj, 'endstream'); $data = substr($obj, $s, ($e === false ? strlen($obj) : $e) - $s);
    if (preg_match('/\/Length\s+(\d+)(?!\s+0\s+R)/', $dict, $lm) && (int) $lm[1] <= strlen($data)) { $data = substr($data, 0, (int) $lm[1]); }
    if (strpos($dict, 'ASCII85Decode') !== false) { $data = pdf_a85($data); }
    if (strpos($dict, 'FlateDecode') !== false) { $d = @gzuncompress($data); if ($d === false) { $d = @gzinflate(substr($data, 2)); } return $d === false ? '' : $d; }
    return $data;
}
function pdf_a85($s) {
    $s = preg_replace('/\s+/', '', $s); if (substr($s, 0, 2) === '<~') { $s = substr($s, 2); } $e = strpos($s, '~>'); if ($e !== false) { $s = substr($s, 0, $e); }
    $o = ''; $n = strlen($s); $i = 0;
    while ($i < $n) {
        if ($s[$i] === 'z') { $o .= "\0\0\0\0"; $i++; continue; }
        $ch = substr($s, $i, 5); $i += 5; $pad = 5 - strlen($ch); $ch .= str_repeat('u', $pad); $v = 0;
        for ($j = 0; $j < 5; $j++) { $v = $v * 85 + (ord($ch[$j]) - 33); }
        $o .= substr(pack('N', $v), 0, 4 - $pad);
    }
    return $o;
}
function pdf_cmap($s) {
    $m = array();
    foreach (explode('beginbfrange', $s) as $k => $blk) {
        if (!$k) { continue; } $blk = explode('endbfrange', $blk)[0];
        preg_match_all('/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(\[[^\]]*\]|<[0-9A-Fa-f]+>)/', $blk, $r, PREG_SET_ORDER);
        foreach ($r as $x) {
            $lo = hexdec($x[1]); $hi = hexdec($x[2]);
            if ($x[3][0] === '[') { preg_match_all('/<([0-9A-Fa-f]+)>/', $x[3], $arr); foreach ($arr[1] as $j => $u) { $m[$lo + $j] = mb_chr(hexdec(substr($u, 0, 4)), 'UTF-8'); } }
            else { $b = hexdec(substr($x[3], 1, 4)); for ($c = $lo; $c <= $hi && $c - $lo < 2000; $c++) { $m[$c] = mb_chr($b + $c - $lo, 'UTF-8'); } }
        }
    }
    foreach (explode('beginbfchar', $s) as $k => $blk) {
        if (!$k) { continue; } $blk = explode('endbfchar', $blk)[0];
        preg_match_all('/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/', $blk, $r, PREG_SET_ORDER);
        foreach ($r as $x) { $m[hexdec($x[1])] = mb_chr(hexdec(substr($x[2], 0, 4)), 'UTF-8'); }
    }
    return $m;
}
function pdf_text_runs($raw) {
    $objs = pdf_objects($raw); $runs = array(); $page = 0;
    foreach ($objs as $id => $ob) {
        if (!preg_match('/\/Type\s*\/Page(?![s\w])/', $ob)) { continue; }
        $page++;
        /* betűkészletek: /F1 8 0 R … (a Resources lehet hivatkozás is) */
        $res = $ob; if (preg_match('/\/Resources\s+(\d+)\s+0\s+R/', $ob, $rm) && isset($objs[(int) $rm[1]])) { $res = $objs[(int) $rm[1]]; }
        $fonts = array();
        $fdict = '';
        if (preg_match('/\/Font\s*<<(.*?)>>/s', $res, $fm)) { $fdict = $fm[1]; }
        elseif (preg_match('/\/Font\s+(\d+)\s+0\s+R/', $res, $fm) && isset($objs[(int) $fm[1]])) { $fdict = $objs[(int) $fm[1]]; }
        if ($fdict !== '') { $fm = array(1 => $fdict);
            preg_match_all('/\/([\w.+-]+)\s+(\d+)\s+0\s+R/', $fm[1], $fl, PREG_SET_ORDER);
            foreach ($fl as $f) {
                $fo = isset($objs[(int) $f[2]]) ? $objs[(int) $f[2]] : ''; $map = null;
                if (preg_match('/\/ToUnicode\s+(\d+)\s+0\s+R/', $fo, $tu) && isset($objs[(int) $tu[1]])) { $map = pdf_cmap((string) pdf_stream($objs[(int) $tu[1]])); }
                $fonts[$f[1]] = array('map' => $map, 'cid' => strpos($fo, 'Identity-H') !== false);
            }
        }
        $content = '';
        if (preg_match('/\/Contents\s*\[([^\]]*)\]/', $ob, $cm)) { preg_match_all('/(\d+)\s+0\s+R/', $cm[1], $cl); foreach ($cl[1] as $c) { if (isset($objs[(int) $c])) { $content .= pdf_stream($objs[(int) $c]) . "\n"; } } }
        elseif (preg_match('/\/Contents\s+(\d+)\s+0\s+R/', $ob, $cm) && isset($objs[(int) $cm[1]])) { $content = (string) pdf_stream($objs[(int) $cm[1]]); }
        preg_match_all('/\((?:\\\\.|[^\\\\)])*\)|<[0-9A-Fa-f\s]*>|\[|\]|\/[^\s\/\[\]()<>]+|[-+]?\d*\.?\d+(?:[eE]-?\d+)?|[A-Za-z\'"*]+/', $content, $tk);
        $st = array(); $font = ''; $fs = 0; $tx = 0; $ty = 0; $lx = 0; $ly = 0; $lead = 0;
        $dec = function ($s) use (&$fonts, &$font) {
            $f = isset($fonts[$font]) ? $fonts[$font] : array('map' => null, 'cid' => false);
            if ($s[0] === '<') {
                $h = preg_replace('/\s+/', '', substr($s, 1, -1)); $o = ''; $w = $f['cid'] ? 4 : 2;
                for ($i = 0; $i + $w <= strlen($h); $i += $w) { $k = hexdec(substr($h, $i, $w)); $o .= isset($f['map'][$k]) ? $f['map'][$k] : ($w === 2 ? chr($k) : '?'); }
                return $o;
            }
            $b = preg_replace_callback('/\\\\([nrtbf()\\\\]|[0-7]{1,3})/', function ($m) { $c = $m[1]; $t = array('n' => "\n", 'r' => "\r", 't' => "\t", 'b' => "\x08", 'f' => "\x0c"); return isset($t[$c]) ? $t[$c] : (ctype_digit($c) ? chr(octdec($c)) : $c); }, substr($s, 1, -1));
            if ($f['map']) { $o = ''; for ($i = 0; $i < strlen($b); $i++) { $k = ord($b[$i]); $o .= isset($f['map'][$k]) ? $f['map'][$k] : $b[$i]; } return $o; }
            return mb_convert_encoding($b, 'UTF-8', 'Windows-1252');
        };
        foreach ($tk[0] as $t) {
            if ($t === '[' || $t === ']' || $t[0] === '/' || $t[0] === '(' || $t[0] === '<' || is_numeric($t)) { $st[] = $t; continue; }
            $n = function ($i) use ($st) { return isset($st[count($st) - $i]) ? (float) $st[count($st) - $i] : 0; };
            switch ($t) {
                case 'Tf': $font = isset($st[count($st) - 2]) ? substr($st[count($st) - 2], 1) : ''; $fs = $n(1); break;
                case 'Tm': $tx = $lx = $n(2); $ty = $ly = $n(1); $fsz = abs($n(6)) > 0.01 && abs($n(6) - 1) > 0.01 ? $n(6) : 1; if ($fsz !== 1) { $fs = $fs * $fsz; } break;
                case 'Td': case 'TD': $lx += $n(2); $ly += $n(1); $tx = $lx; $ty = $ly; if ($t === 'TD') { $lead = -$n(1); } break;
                case 'TL': $lead = $n(1); break;
                case 'T*': $ly -= $lead; $tx = $lx; $ty = $ly; break;
                case 'Tj': case "'": case '"': if ($t !== 'Tj') { $ly -= $lead; $tx = $lx; $ty = $ly; } $s = end($st); if ($s !== false && ($s[0] === '(' || $s[0] === '<')) { $runs[] = array($page, (int) round($tx), (int) round($ty), $fs, $dec($s)); } break;
                case 'TJ': $i = array_search('[', array_reverse($st, true), true); $txt = ''; if ($i !== false) { foreach (array_slice($st, $i + 1) as $p) { if ($p !== ']' && ($p[0] === '(' || $p[0] === '<')) { $txt .= $dec($p); } } } $runs[] = array($page, (int) round($tx), (int) round($ty), $fs, $txt); break;
            }
            $st = array();
        }
    }
    return array_values(array_filter($runs, function ($r) { return trim($r[4]) !== ''; }));
}
/* a Siókom-naptár értelmezése: év, szelektív és zöldhulladék dátumai a táblázatból, vegyes gyűjtés szabálya, lomtalanítás */
function waste_parse_siokom($runs) {
    $HM = array('január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december');
    $low = function ($s) { return mb_strtolower(trim($s), 'UTF-8'); };
    $runs = array_values(array_filter($runs, function ($r) { return !preg_match('/Kérjük|akadályozz/u', $r[4]); }));   /* a kihelyezési kérés szövege keveredne a szabállyal */
    usort($runs, function ($a, $b) { return $a[0] - $b[0] ?: ($b[2] - $a[2] ?: $a[1] - $b[1]); });
    $all = implode(' ', array_map(function ($r) { return trim($r[4]); }, $runs)); $all = preg_replace('/\s+/u', ' ', $all);
    if (!preg_match('/(20\d\d)\.?\s*évi\s+hullad/u', $all, $ym)) { return array(false, 'Nem találom az évszámot a naptárban.'); }
    $Y = (int) $ym[1];
    $w = function ($r) { $t = trim($r[4]); $f = $r[3] ? $r[3] : 9; $n = preg_match_all('/[,.\s]/u', $t); return ((mb_strlen($t, 'UTF-8') - $n) * 0.55 + $n * 0.25) * $f; };   /* becsült szövegszélesség */
    $hdr = array(); foreach ($runs as $r) { $i = array_search($low($r[4]), $HM, true); if ($i !== false && !isset($hdr[$i])) { $hdr[$i] = array($r[1] + $w($r) / 2, $r[2], $r[0]); } }
    if (count($hdr) < 12) { return array(false, 'Nem találom a hónapok fejlécét a naptárban.'); }
    $row = function ($label) use ($runs, $low, $hdr, $w, $Y) {
        $lab = null; foreach ($runs as $r) { if ($r[0] === $hdr[0][2] && strpos($low($r[4]), $label) === 0 && $r[2] < $hdr[0][1]) { $lab = $r; break; } }
        if (!$lab) { return null; }
        $cells = array(); foreach ($runs as $r) { if ($r[0] === $lab[0] && abs($r[2] - $lab[2]) <= 4 && $r[1] > $lab[1] + 20 && preg_match('/^[\d,.\s]+$/', $r[4])) { $cells[] = $r; } }
        usort($cells, function ($a, $b) { return $a[1] - $b[1]; });
        $merged = array(); foreach ($cells as $c) { $k = count($merged) - 1; if ($k >= 0 && substr(rtrim($merged[$k][4]), -1) === ',' && $c[1] - ($merged[$k][1] + $w($merged[$k])) < 8) { $merged[$k][4] .= $c[4]; } else { $merged[] = $c; } }
        $dates = array();
        foreach ($merged as $c) {
            $cx = $c[1] + $w($c) / 2; $best = 0; $bd = 1e9; foreach ($hdr as $mi => $h) { if (abs($h[0] - $cx) < $bd) { $bd = abs($h[0] - $cx); $best = $mi; } }
            foreach (preg_split('/[,.\s]+/', $c[4], -1, PREG_SPLIT_NO_EMPTY) as $d) { if (checkdate($best + 1, (int) $d, $Y)) { $dates[] = sprintf('%04d-%02d-%02d', $Y, $best + 1, (int) $d); } }
        }
        sort($dates); return array_values(array_unique($dates));
    };
    $sel = $row('szelektív'); $green = $row('zöldhullad');
    if (!$sel) { return array(false, 'Nem találom a szelektív sort a naptárban.'); }
    /* vegyes: „01.01-06.30 és 09.01-12.31 között HÉTFŐ … 07.01-08.31 között CSÜTÖRTÖK és VASÁRNAP” */
    $mixed = array(); $rule = '';
    $p = mb_strpos($all, 'Vegyes hulladékgyűjtési nap', 0, 'UTF-8');
    if ($p !== false) {
        $t = mb_substr($all, $p, 400, 'UTF-8'); $t = preg_replace('/Kérjük.*?akadályozza!?/u', ' ', $t); $t = preg_replace('/\s*-\s*/u', '-', preg_replace('/(\d)\s*\.\s*(\d)/u', '$1.$2', $t));
        $t = preg_split('/Szolgáltató|Lomtalan|Hulladékudvar/u', $t)[0]; $rule = trim(preg_replace('/\s+/u', ' ', str_replace('Vegyes hulladékgyűjtési nap:', '', $t)));
        $WD = array('VASÁRNAP' => 0, 'HÉTFŐ' => 1, 'KEDD' => 2, 'SZERDA' => 3, 'CSÜTÖRTÖK' => 4, 'PÉNTEK' => 5, 'SZOMBAT' => 6);
        preg_match_all('/(\d{2})\.(\d{2})-(\d{2})\.(\d{2})|között|VASÁRNAP|HÉTFŐ|KEDD|SZERDA|CSÜTÖRTÖK|PÉNTEK|SZOMBAT/u', $t, $tk, PREG_SET_ORDER);
        $per = array(); $after = false; $days = array();
        $flush = function () use (&$per, &$days, &$mixed, $Y) {
            foreach ($per as $pp) { for ($d = sprintf('%04d-%s', $Y, $pp[0]); $d <= sprintf('%04d-%s', $Y, $pp[1]); $d = add_days($d, 1)) { if (in_array(weekday($d), $days, true)) { $mixed[] = $d; } } }
            $per = array(); $days = array();
        };
        foreach ($tk as $x) {
            if (!empty($x[1])) { if ($after) { $flush(); $after = false; } $per[] = array($x[1] . '-' . $x[2], $x[3] . '-' . $x[4]); }
            elseif ($x[0] === 'között') { $after = true; }
            elseif ($after && isset($WD[$x[0]])) { $days[] = $WD[$x[0]]; }
        }
        $flush(); sort($mixed); $mixed = array_values(array_unique($mixed));
    }
    $lom = array();
    if (preg_match_all('/(20\d\d)\s*\.\s*(' . implode('|', $HM) . ')\s+(\d{1,2})\b/u', $all, $lm, PREG_SET_ORDER)) {
        foreach ($lm as $x) { $mi = array_search($x[2], $HM, true) + 1; if (checkdate($mi, (int) $x[3], (int) $x[1])) { $lom[] = sprintf('%04d-%02d-%02d', $x[1], $mi, $x[3]); } }
        sort($lom); $lom = array_values(array_unique($lom));
    }
    return array(true, array('year' => $Y, 'mixed' => $mixed, 'mixed_rule' => $rule, 'selective' => $sel, 'green' => $green ? $green : array(), 'bulky' => $lom));
}
function waste_src_url($s, $year) { return str_replace('{EV}', (string) $year, $s['waste_src']); }
function waste_fetch_year($s, $year) {
    $u = waste_src_url($s, $year);
    $u = preg_replace_callback('#[^A-Za-z0-9/:._~%{}-]#u', function ($m) { return rawurlencode($m[0]); }, $u);   /* ékezetes / szóközös útvonal */
    list($code, $body) = http_get($u, 40);
    if ($code !== 200 || strncmp($body, '%PDF', 4) !== 0) { return array(false, $year > (int) date('Y') ? $year . ': a Siókom még nem tette közzé – naponta megnézem.' : $year . ': a naptár nem érhető el ezen a linken: ' . $u); }
    list($ok, $res) = waste_parse_siokom(pdf_text_runs($body));
    if (!$ok) { return array(false, $year . ': ' . $res); }
    if ($res['year'] !== (int) $year) { return array(false, $year . ': a letöltött naptár ' . $res['year'] . '-es.'); }
    return array(true, $res);
}
/* az automatikus típusok cseréje (a kézzel felvett típusok maradnak) */
function waste_apply_auto(&$db, $years) {
    $def = array('mixed' => array('Vegyes (kommunális) hulladék', '#5b6b7a', 'reggel 5 óráig legyen kint'), 'selective' => array('Szelektív – papír, műanyag, fém', '#f2b233', 'reggel 5 óráig legyen kint'),
        'green' => array('Zöldhulladék', '#3c9a5f', 'zsákolva, ágak max. 1 m-es kötegben – reggel 5 óráig'), 'bulky' => array('Lomtalanítás', '#8a6630', 'csak ha a hónap 15-éig írásban megrendelted (siokom@siokom.hu)'));
    $keep = array_values(array_filter(isset($db['waste']) ? $db['waste'] : array(), function ($t) { return empty($t['auto']); }));
    $old = array(); foreach (isset($db['waste']) ? $db['waste'] : array() as $t) { if (!empty($t['auto'])) { $old[$t['auto']] = $t; } }
    $auto = array();
    foreach ($def as $k => $d) {
        $dates = array(); foreach ($years as $y) { $dates = array_merge($dates, $y[$k]); }
        if (!$dates) { continue; }
        $o = isset($old[$k]) ? $old[$k] : array();
        $auto[] = array('id' => isset($o['id']) ? $o['id'] : bin2hex(random_bytes(5)), 'name' => $d[0], 'kind' => 'dates', 'weekday' => 1, 'nth' => 1, 'start' => today(), 'season_from' => '', 'season_to' => '',
            'dates' => array_values(array_unique($dates)), 'skip' => isset($o['skip']) ? $o['skip'] : array(), 'note' => $d[2],
            'color' => isset($o['color']) ? $o['color'] : $d[1], 'active' => isset($o['active']) ? $o['active'] : 1, 'auto' => $k);
    }
    $db['waste'] = array_slice(array_merge($auto, $keep), 0, 12);
}
function waste_auto_due($db) {
    $s = $db['settings']; if (empty($s['waste_auto'])) { return false; }
    $ws = isset($db['waste_sync']) ? $db['waste_sync'] : array();
    $have = isset($ws['years']) ? $ws['years'] : array(); $Y = (int) date('Y');
    $need = !in_array($Y, $have, true) || ((int) date('n') >= 11 && !in_array($Y + 1, $have, true));
    $last = isset($ws['tried']) ? $ws['tried'] : '';
    return $need ? $last !== today() : ($last === '' || nights($last, today()) >= 30);   /* hiányzó év: naponta próbálja; meglévő: havonta frissít (ha módosítanak) */
}
function waste_auto_run(&$db) {
    $s = $db['settings']; $Y = (int) date('Y'); $got = array(); $log = array();
    foreach (array($Y, $Y + 1) as $y) {
        if ($y > $Y && (int) date('n') < 11) { continue; }
        list($ok, $res) = waste_fetch_year($s, $y);
        if ($ok) { $got[] = $res; $log[] = $y . ': ' . count($res['mixed']) . ' vegyes, ' . count($res['selective']) . ' szelektív, ' . count($res['green']) . ' zöld, ' . count($res['bulky']) . ' lomtalanítási nap'; }
        else { $log[] = $res; }
    }
    $prev = isset($db['waste_sync']) ? $db['waste_sync'] : array();
    if ($got) {
        /* a már letöltött, de most el nem ért év adatai maradnak */
        $years = array_map(function ($g) { return $g['year']; }, $got);
        if (!empty($prev['data'])) { foreach ($prev['data'] as $pd) { if (!in_array($pd['year'], $years, true) && $pd['year'] >= $Y) { $got[] = $pd; $years[] = $pd['year']; } } }
        waste_apply_auto($db, $got);
        $db['waste_sync'] = array('ok' => today(), 'tried' => today(), 'years' => $years, 'data' => $got, 'log' => $log, 'src' => waste_src_url($s, $Y));
    } else {
        $db['waste_sync'] = array_merge($prev, array('tried' => today(), 'log' => $log, 'error' => 1));
    }
    return $log;
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
    if (is_closed_ext($b) && !$b['name']) { $who = 'zárt nap (név nélkül – pl. családtag / nem fizető vendég)'; }
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
        'last_sent' => isset($db['remind_sent']) ? $db['remind_sent'] : '',
        'sync' => isset($db['waste_sync']) ? array_diff_key($db['waste_sync'], array('data' => 1)) : null, 'auto' => (int) $s['waste_auto'], 'src' => $s['waste_src']);
}

/* ================================================================ útvonalak */
if (defined('ZB_TEST')) { return; }   /* tesztek: csak a függvények kellenek (api/teszt/ical-teszt.php) */
$r = isset($_GET['r']) ? preg_replace('/[^a-z_]/', '', $_GET['r']) : '';
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$P = body();

switch ($r) {

/* ------------------------------ 2026-11-14: a HIVATALOS balatoni viharjelzés (HungaroMet) medencénként – a VR-vitorlásversenynek.
   A böngésző a met.hu-t közvetlenül nem érheti el (CORS), ezért itt olvassuk ki, 5 percre gyorsítótárazva.
   Válasz: { ok, ts, season, basins: { nyugati: 0|1|2, kozepso: 0|1|2, keleti: 0|1|2 } } – 0 = alapfok, 1 = elsőfok (45/perc), 2 = másodfok (90/perc). */
case 'viharjelzes':
    $cf = sys_get_temp_dir() . '/zephyr-viharjelzes.json';
    if (is_file($cf) && time() - filemtime($cf) < 300) { header('Content-Type: application/json; charset=utf-8'); header('Access-Control-Allow-Origin: *'); echo file_get_contents($cf); exit; }
    $ctx = stream_context_create(array('http' => array('timeout' => 6, 'user_agent' => 'ZephyrApartmanhaz/1.0 (+balatoni-udules.hu)'), 'https' => array('timeout' => 6)));
    $html = @file_get_contents('https://www.met.hu/idojaras/veszelyjelzes/tavi_viharjelzes/main.php', false, $ctx);
    $lvl = function ($name) use ($html) {
        if (!$html) { return null; }
        $t = html_entity_decode(strip_tags($html), ENT_QUOTES, 'UTF-8');
        if (!preg_match('/A ' . $name . ' medencében([^.]*)\./u', $t, $m)) { return null; }
        if (mb_stripos($m[1], 'másodfokú', 0, 'UTF-8') !== false) { return 2; }
        if (mb_stripos($m[1], 'elsőfokú', 0, 'UTF-8') !== false) { return 1; }
        return 0;
    };
    $md = (int) date('n'); $season = $md >= 4 && $md <= 10;
    $res = array('ok' => (bool) $html, 'ts' => date('c'), 'season' => $season, 'source' => 'HungaroMet – met.hu tavi viharjelzés',
        'basins' => array('nyugati' => $lvl('nyugati'), 'kozepso' => $lvl('középső'), 'keleti' => $lvl('keleti')));
    $js = json_encode($res, JSON_UNESCAPED_UNICODE); if ($html) { @file_put_contents($cf, $js); }
    header('Content-Type: application/json; charset=utf-8'); header('Access-Control-Allow-Origin: *'); echo $js; exit;

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
        'min_nights' => (int) $s['min_nights'], 'max_nights' => (int) $s['max_nights'], 'lead_days' => lead_eff($s), 'horizon_days' => (int) $s['horizon_days'],
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
    $busy = busy_map($db, $apt, add_days($from, -1), $to);   /* egy nappal korábbról is: a nyitónapon távozó vendég is látsszon */
    $days = array();
    for ($d = $from; $d < $to; $d = add_days($d, 1)) {
        /* érkezés/távozás jelzése a naptárban (a tulajdonos kérése, nov. 9.): személyes adat nélkül, csak hogy aznap jön-e/megy-e vendég; a zárt (családi) napok nem számítanak */
        $b = isset($busy[$d]) ? $busy[$d] : null; $pd = add_days($d, -1); $pb = isset($busy[$pd]) ? $busy[$pd] : null;
        $days[] = array('d' => $d, 'p' => price_for($s, $apt, $d), 'free' => day_free($s, $d, $busy),
            'arr' => ($b && $b['checkin'] === $d && !is_closed_ext($b)) ? 1 : 0, 'dep' => ($pb && $pb['checkout'] === $d && !is_closed_ext($pb)) ? 1 : 0);
    }
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
    /* kétlépcsős védelem: helyes jelszó után e-mailben küldött 6 jegyű ellenőrzőkód (10 percig érvényes, 5 próbálkozás) */
    $code = isset($P['code']) ? preg_replace('/\D/', '', (string) $P['code']) : '';
    $to = ZB_ADMIN_EMAIL;
    if ($code === '') {
        if (!rate_hit($db, 'otp', 5, 900)) { db_save($db); fail('Túl sok kódkérés. Várj 15 percet.', 429); }
        $c = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $db['otp'] = array('h' => hash('sha256', $c), 'exp' => time() + 600, 'tries' => 0);
        db_save($db);
        $sent = send_mail($db['settings'], $to, 'Belépési kód: ' . $c . ' – Zephyr admin',
            "Szia!\n\nA Zephyr tulajdonosi felületére most valaki a helyes jelszóval próbál belépni.\n\nAz ellenőrzőkód: " . $c . "\n\nA kód 10 percig érvényes. Ha nem te voltál, ne add meg a kódot sehol, és változtasd meg a jelszót.\n");
        if (!$sent) { fail('Nem sikerült elküldeni az ellenőrzőkódot e-mailben. Próbáld újra később.', 500); }
        $at = strpos($to, '@'); $mask = substr($to, 0, 2) . str_repeat('•', max(1, $at - 2)) . substr($to, $at);
        out(array('ok' => true, 'need_code' => true, 'sent_to' => $mask));
    }
    $o = isset($db['otp']) ? $db['otp'] : null;
    if (!$o || $o['exp'] < time()) { unset($db['otp']); db_save($db); fail('Az ellenőrzőkód lejárt. Kérj újat.', 401); }
    if (!hash_equals($o['h'], hash('sha256', $code))) {
        $db['otp']['tries']++; if ($db['otp']['tries'] >= 5) { unset($db['otp']); }
        db_save($db); usleep(400000); fail('Hibás ellenőrzőkód.', 401);
    }
    unset($db['otp']);
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
    foreach ((array) $s['sync_log'] as $k => $l) { if (empty($l['ok'])) { $warn[] = 'Naptárszinkron hiba (' . $k . '): ' . $l['msg']; } elseif (strpos((string) $l['msg'], 'üres naptár') !== false) { $warn[] = 'Naptárszinkron (' . $k . '): ' . $l['msg']; } }
    $xs = array(); foreach ($db['bookings'] as $b) { if (!empty($b['xconflict']) && !isset($xs[$b['xconflict']])) { $xs[$b['xconflict']] = 1; $warn[] = 'KETTŐS FOGLALÁS két platformon: ' . $b['xconflict'] . ' – nézd meg a platformokon (Beállítások → Naptárszinkron → nyers .ics).'; } }
    foreach ($db['bookings'] as $b) { if (!empty($b['feed_gone']) && $b['checkout'] > today()) { $warn[] = 'Eltűnt a platform naptárából, de folyamatban lévő tartózkodás, ezért megtartottam: ' . $b['label'] . ' (' . hu_date($b['checkin']) . ' – ' . hu_date($b['checkout']) . ').'; } }
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
    $busy = array_filter(busy_map($db, $apt, $ci, $co), function ($x) { return !is_closed_ext($x); });   /* a platformon zárt napra rá lehet írni a saját (pl. családi) bejegyzést – az nem ütközés */
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
    foreach (array('guest_ev', 'guest_ev_approved') as $k) { if (isset($in[$k])) { $s[$k] = $in[$k] ? 1 : 0; } }
    if (isset($in['waste_auto'])) { $s['waste_auto'] = $in['waste_auto'] ? 1 : 0; }
    if (isset($in['waste_src'])) { $v = clean($in['waste_src'], 400); if ($v !== '' && !preg_match('#^https?://#i', $v)) { fail('A hulladéknaptár linkje https://-sel kezdődjön.'); } if ($v !== '') { $s['waste_src'] = $v; } }
    if (isset($in['guest_ev_days'])) { $s['guest_ev_days'] = max(2, min(14, (int) $in['guest_ev_days'])); }
    if (isset($in['guest_ev_bike_km'])) { $s['guest_ev_bike_km'] = max(5, min(60, (int) $in['guest_ev_bike_km'])); }
    if (isset($in['ferry_url'])) { $v = clean($in['ferry_url'], 300); $s['ferry_url'] = preg_match('#^https?://#i', $v) ? $v : 'https://bahart.hu/'; }
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

case 'ical_raw':   /* tulajdonos: a legutóbb letöltött NYERS .ics megtekintése (apartman + platform) – hibakereséshez */
    $db = db_load(); require_admin($db);
    $apt = isset($_GET['apt']) ? preg_replace('/[^a-z]/', '', $_GET['apt']) : ''; $src = isset($_GET['src']) ? preg_replace('/[^a-z]/', '', $_GET['src']) : '';
    $f = ical_raw_path($apt, $src); if (!$apt || !$src || !is_file($f)) { fail('Ehhez a naptárhoz még nincs letöltött nyers adat – futtass egy szinkront.', 404); }
    $raw = file_get_contents($f); $p = strpos($raw, "\n"); $raw = $p === false ? '' : substr($raw, $p + 1);
    header('Content-Type: text/plain; charset=utf-8'); echo $raw; exit;
case 'ext_restore':   /* tulajdonos: a szinkron által törölt (lemondottnak vélt) külső foglalás visszaállítása a lomtárból */
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db); $id = isset($P['id']) ? (string) $P['id'] : '';
    foreach ((array) (isset($db['ext_removed']) ? $db['ext_removed'] : array()) as $k => $b) { if ($b['id'] === $id) { unset($b['removed_at']); $db['bookings'][] = $b; unset($db['ext_removed'][$k]); $db['ext_removed'] = array_values($db['ext_removed']); db_save($db); out(array('ok' => true, 'message' => 'Visszaállítva.')); } }
    fail('Nincs ilyen törölt tétel.', 404);

case 'cron':  /* tárhely ütemezőből: …/api/index.php?r=cron&key=… */
    $db = db_load();
    if (!hash_equals((string) $db['settings']['ical_key'], isset($_GET['key']) ? (string) $_GET['key'] : '')) { fail('Hozzáférés megtagadva.', 403); }
    $log = sync_all($db); $rm = remind_due($db) ? remind_run($db) : null; $evf = ev_due($db) ? ev_import_all($db) : null; $wsy = waste_auto_due($db) ? waste_auto_run($db) : null; $gev = null; if (guest_ev_due($db)) { $db['guest_ev_day'] = today(); $gev = guest_ev_run($db); } db_save($db); out(array('ok' => true, 'log' => $log, 'remind' => $rm, 'programs' => $evf, 'guest_programs' => $gev, 'waste' => $wsy));

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
    if (ev_due($db)) { ev_import_all($db); db_save($db); }   /* naponta egyszer a forrásokból is frissül */
    if (guest_ev_due($db)) { $db['guest_ev_day'] = today(); guest_ev_run($db); db_save($db); }
    if (waste_auto_due($db)) { waste_auto_run($db); db_save($db); }   /* hulladéknaptár: évente magától a Siókomtól */   /* érkezés előtti programlevelek (ingyenes, ütemező nélkül is) */
    $seenK = array();
    foreach ((array) (isset($db['events']) ? $db['events'] : array()) as $e) {
        if ((isset($e['to']) && $e['to'] ? $e['to'] : $e['from']) < $t || !empty($e['hidden']) || !empty($e['gone'])) { continue; }
        $k = ev_key($e); if (isset($seenK[$k])) { continue; } $seenK[$k] = 1;   /* duplikátum kiszűrése */
        unset($e['feed'], $e['ext'], $e['man'], $e['gone'], $e['hidden']); $e['where'] = ev_where($db['settings'], $e); $list[] = $e;
    }
    usort($list, function ($a, $b) { return strcmp($a['from'] . $a['time'], $b['from'] . $b['time']); });
    header('Cache-Control: public, max-age=300');
    out(array('today' => $t, 'events' => $list, 'updated' => isset($db['ev_sync']) ? $db['ev_sync'] : ''));

case 'events_all':
    $db = db_load(); require_admin($db);
    $list = isset($db['events']) ? $db['events'] : array();
    usort($list, function ($a, $b) { return strcmp($a['from'] . $a['time'], $b['from'] . $b['time']); });
    out(array('today' => today(), 'events' => $list, 'feeds' => isset($db['settings']['ev_feeds']) ? $db['settings']['ev_feeds'] : array(), 'updated' => isset($db['ev_sync']) ? $db['ev_sync'] : ''));

case 'nav':   /* a VR-ben a tulajdonos által igazított útjelző-helyek (mindenkinek) – nyilvános, csak koordináták */
    $db = db_load(); out(array('nav' => isset($db['nav']) && is_array($db['nav']) && $db['nav'] ? $db['nav'] : new stdClass(), 'nav2d' => isset($db['nav2d']) && is_array($db['nav2d']) && $db['nav2d'] ? $db['nav2d'] : new stdClass(), 'names' => isset($db['navnames']) && is_array($db['navnames']) && $db['navnames'] ? $db['navnames'] : new stdClass(), 'views' => isset($db['navviews']) && is_array($db['navviews']) && $db['navviews'] ? $db['navviews'] : new stdClass(), 'start' => isset($db['navstart']) && is_string($db['navstart']) ? $db['navstart'] : '', 'marks' => isset($db['navmarks']) && is_array($db['navmarks']) && $db['navmarks'] ? $db['navmarks'] : new stdClass(), 'del' => isset($db['navdel']) && is_array($db['navdel']) && $db['navdel'] ? $db['navdel'] : new stdClass(), 'add' => isset($db['navadd']) && is_array($db['navadd']) && $db['navadd'] ? $db['navadd'] : new stdClass()));
case 'nav_save':   /* tulajdonos: útjelzők igazítása a VR-ben (jelenet → cél → [x, y] a panorámán) */
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db);
    $in = isset($P['nav']) && is_array($P['nav']) ? $P['nav'] : array(); $o = array(); $n = 0;
    foreach ($in as $sc => $tos) {
        if (!is_string($sc) || !preg_match('/^[a-z0-9-]{1,48}$/', $sc) || !is_array($tos)) { continue; }
        foreach ($tos as $to => $v) {
            if (!is_string($to) || !preg_match('/^[a-z0-9-]{1,48}$/', $to) || !is_array($v) || count($v) !== 2) { continue; }
            $x = (float) $v[0]; $y = (float) $v[1]; if ($x < 0 || $x > 1 || $y < 0 || $y > 1) { continue; }
            $o[$sc][$to] = array(round($x, 4), round($y, 4)); if (++$n > 3000) { break 2; }
        }
    }
    $key = (isset($P['mode']) && $P['mode'] === '2d') ? 'nav2d' : 'nav';   /* VR és 2D külön */
    $db[$key] = $o;
    /* 2026-11-11: a térben átírt jelzőnevek (jelenet → cél → név), VR és 2D közös */
    if (isset($P['names']) && is_array($P['names'])) { $nm = array(); $k = 0;
        foreach ($P['names'] as $sc => $tos) { if (!is_string($sc) || !preg_match('/^[a-z0-9-]{1,48}$/', $sc) || !is_array($tos)) { continue; }
            foreach ($tos as $to => $v) { if (!is_string($to) || !preg_match('/^[a-z0-9-]{1,48}$/', $to) || !is_string($v)) { continue; }
                $v = clean($v, 28); if ($v === '') { continue; } $nm[$sc][$to] = $v; if (++$k > 1500) { break 2; } } }
        $db['navnames'] = $nm; }
    /* 2026-11-13: szerkesztő – a képek kezdő nézete (jelenet → 0..1) és a séta kezdő képe */
    if (isset($P['views']) && is_array($P['views'])) { $vw = array(); $k = 0;
        foreach ($P['views'] as $sc => $v) { if (!is_string($sc) || !preg_match('/^[a-z0-9-]{1,48}$/', $sc) || !is_numeric($v)) { continue; } $v = (float) $v; if ($v < 0 || $v > 1) { continue; } $vw[$sc] = round($v, 3); if (++$k > 500) { break; } }
        $db['navviews'] = $vw; }
    /* 2026-11-13: szerkesztő – törölt (del: jelenet → cél → 0/1) és új táblák (add: jelenet → cél → [x, y] vagy 0) */
    foreach (array('del' => 'navdel', 'add' => 'navadd') as $pk => $dk) { if (!isset($P[$pk]) || !is_array($P[$pk])) { continue; } $o2 = array(); $k = 0;
        foreach ($P[$pk] as $sc => $tos) { if (!is_string($sc) || !preg_match('/^[a-z0-9-]{1,48}$/', $sc) || !is_array($tos)) { continue; }
            foreach ($tos as $to => $v) { if (!is_string($to) || !preg_match('/^[a-z0-9-]{1,48}$/', $to)) { continue; }
                if ($pk === 'add' && is_array($v) && count($v) === 2) { $x = (float) $v[0]; $y = (float) $v[1]; if ($x < 0 || $x > 1 || $y < 0 || $y > 1) { continue; } $o2[$sc][$to] = array(round($x, 4), round($y, 4)); }
                else { $o2[$sc][$to] = $v ? 1 : 0; if ($pk === 'add' && $v) { unset($o2[$sc][$to]); } }
                if (++$k > 1500) { break 2; } } }
        $db[$dk] = $o2; }
    /* 2026-11-13: szerkesztő – sárga jelzések (jelenet → mv / del / tx / add) */
    if (isset($P['marks']) && is_array($P['marks'])) { $mk = array(); $k = 0;
        foreach ($P['marks'] as $sc => $o) { if (!is_string($sc) || !preg_match('/^[a-z0-9-]{1,48}$/', $sc) || !is_array($o)) { continue; }
            $r = array('mv' => new stdClass(), 'del' => new stdClass(), 'tx' => new stdClass(), 'add' => array());
            foreach (array('mv', 'del', 'tx') as $f) { if (!isset($o[$f]) || !is_array($o[$f])) { continue; } $tmp = array();
                foreach ($o[$f] as $i => $v) { if (!preg_match('/^\d{1,3}$/', (string) $i)) { continue; }
                    if ($f === 'mv') { if (is_array($v) && count($v) === 2) { $tmp['i' . $i] = array(round((float) $v[0], 4), round((float) $v[1], 4)); } }
                    elseif ($f === 'del') { if ($v) { $tmp['i' . $i] = 1; } }
                    elseif (is_string($v) && clean($v, 60) !== '') { $tmp['i' . $i] = clean($v, 60); } }
                if ($tmp) { $obj = new stdClass(); foreach ($tmp as $ki => $vv) { $nk = substr($ki, 1); $obj->$nk = $vv; } $r[$f] = $obj; } }
            if (isset($o['add']) && is_array($o['add'])) { foreach ($o['add'] as $a2) { if (is_array($a2) && count($a2) >= 3 && is_string($a2[2])) { $r['add'][] = array(round((float) $a2[0], 4), round((float) $a2[1], 4), clean($a2[2], 60)); } else { $r['add'][] = null; } if (++$k > 600) { break 2; } } }
            $mk[$sc] = $r; }
        $db['navmarks'] = $mk; }
    if (isset($P['start']) && is_string($P['start']) && preg_match('/^[a-z0-9-]{0,48}$/', $P['start'])) { $db['navstart'] = $P['start']; }
    db_save($db); out(array('ok' => true, 'n' => $n, 'mode' => $key));
case 'events_save':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db);
    $in = isset($P['events']) && is_array($P['events']) ? $P['events'] : array();
    $url = ev_url_fn(); $o = array(); $prev = array();
    foreach ((array) (isset($db['events']) ? $db['events'] : array()) as $e) { $prev[$e['id']] = $e; }
    foreach (array_slice($in, 0, 800) as $e) {
        if (!is_array($e)) { continue; }
        $title = clean(isset($e['title']) ? $e['title'] : '', 140);
        if ($title === '') { continue; }
        $f = isset($e['from']) ? (string) $e['from'] : ''; $t = isset($e['to']) ? (string) $e['to'] : '';
        if (!valid_date($f)) { fail('Hibás kezdő dátum: „' . $title . '”.'); }
        if ($t !== '' && (!valid_date($t) || $t < $f)) { fail('A záró dátum nem lehet a kezdés előtt: „' . $title . '”.'); }
        $n = ev_clean($e, $url);
        $old = isset($prev[$n['id']]) ? $prev[$n['id']] : null;
        if ($old) {   /* importált program kézi javítása: a következő frissítés nem írja felül */
            $cmp = function ($x) { unset($x['checked'], $x['man'], $x['gone'], $x['top'], $x['hidden']); return $x; };
            if ($cmp(ev_clean($old, $url)) != $cmp($n)) { $n['man'] = !empty($n['feed']) ? 1 : 0; $n['checked'] = today(); $n['gone'] = 0; }
        }
        $o[] = $n;
    }
    $db['events'] = $o; db_save($db);
    out(array('ok' => true, 'message' => count($o) . ' program elmentve.', 'events' => $o));

case 'ev_feeds_save':   /* programforrások (iCal / RSS / WordPress-eseménynaptár) mentése */
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db); $url = ev_url_fn(); $old = array();
    foreach ((array) (isset($db['settings']['ev_feeds']) ? $db['settings']['ev_feeds'] : array()) as $f) { $old[$f['id']] = $f; }
    $out = array();
    foreach (array_slice((array) (isset($P['feeds']) ? $P['feeds'] : array()), 0, 30) as $f) {
        if (!is_array($f)) { continue; } $u = $url(isset($f['url']) ? $f['url'] : ''); if ($u === '' || !preg_match('#^https?://#i', $u)) { continue; }
        $id = isset($f['id']) && preg_match('/^[a-f0-9]{6,16}$/', (string) $f['id']) ? (string) $f['id'] : bin2hex(random_bytes(5));
        $o = isset($old[$id]) ? $old[$id] : array();
        $out[] = array('id' => $id, 'name' => clean(isset($f['name']) && $f['name'] !== '' ? $f['name'] : parse_url($u, PHP_URL_HOST), 80), 'url' => $u,
            'town' => clean(isset($f['town']) ? $f['town'] : '', 60), 'cat' => isset($f['cat']) && in_array($f['cat'], EV_CATS, true) ? $f['cat'] : 'egyeb', 'on' => !empty($f['on']) ? 1 : 0,
            'last' => isset($o['last']) ? $o['last'] : '', 'ok' => isset($o['ok']) ? $o['ok'] : null, 'msg' => isset($o['msg']) ? $o['msg'] : '', 'count' => isset($o['count']) ? $o['count'] : 0);
    }
    $ids = array_column($out, 'id');
    $db['events'] = array_values(array_filter((array) $db['events'], function ($e) use ($ids) { return empty($e['feed']) || in_array($e['feed'], $ids, true) || !empty($e['man']); }));   /* törölt forrás programjai is törlődnek */
    $db['settings']['ev_feeds'] = $out; db_save($db);
    out(array('ok' => true, 'message' => count($out) . ' programforrás elmentve.', 'feeds' => $out));

case 'ev_import':   /* „Frissítés most” a tulajdonosi felületről */
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db); $feeds = ev_import_all($db); db_save($db);
    $list = $db['events']; usort($list, function ($a, $b) { return strcmp($a['from'] . $a['time'], $b['from'] . $b['time']); });
    out(array('ok' => true, 'message' => $feeds ? count($feeds) . ' forrás frissítve.' : 'Nincs megadva programforrás.', 'feeds' => $feeds, 'events' => $list, 'updated' => $db['ev_sync']));

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

case 'waste_sync':   /* „Frissítés most”: hulladéknaptár letöltése a Siókom oldaláról */
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db);
    $log = waste_auto_run($db); db_save($db);
    out(array_merge(array('ok' => empty($db['waste_sync']['error']), 'message' => implode(' · ', $log)), waste_payload($db)));

case 'remind_test':
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db);
    $prev = isset($db['remind_sent']) ? $db['remind_sent'] : '';
    list($ok, $msg) = remind_run($db, true);
    $db['remind_sent'] = $prev;   /* a próba nem számít bele a napi küldésbe */
    db_save($db); out(array('ok' => $ok, 'message' => $msg));

case 'vendeg_programok':   /* a vendég saját programoldala – a levélben kapott linkről */
    $db = db_load(); $id = isset($_GET['b']) ? (string) $_GET['b'] : ''; $i = find_idx($db, $id);
    if ($i < 0 || !hash_equals(guest_key($db['bookings'][$i]), isset($_GET['k']) ? (string) $_GET['k'] : '')) { header('Content-Type: text/html; charset=utf-8'); http_response_code(404); echo 'A link nem érvényes.'; exit; }
    $opt = !empty($_GET['leiratkozas']);
    if ($opt && empty($db['bookings'][$i]['ev_optout'])) { $db['bookings'][$i]['ev_optout'] = 1; $db['bookings'][$i]['log'][] = array('t' => time(), 's' => $db['bookings'][$i]['status'], 'u' => 'vendég', 'x' => 'Leiratkozott a programajánlóról'); db_save($db); }
    header('Content-Type: text/html; charset=utf-8'); header('X-Robots-Tag: noindex');
    echo guest_page($db, $db['bookings'][$i], $opt); exit;

case 'guest_ev_send':   /* tulajdonos: programlevél kézi küldése egy foglaláshoz (vagy próba magadnak) */
    if ($method !== 'POST') { fail('POST kell.', 405); }
    $db = db_load(); require_admin($db); $s = $db['settings'];
    $i = find_idx($db, isset($P['id']) ? (string) $P['id'] : '');
    if ($i < 0) {   /* nincs megadva foglalás: próba a legközelebbi érkezővel, vagy egy 3 napos mintafoglalással */
        $best = null;
        foreach ($db['bookings'] as $b) { if ($b['checkin'] >= today() && in_array(eff_status($s, $b), array('paid', 'approved', 'pending'), true) && (!$best || $b['checkin'] < $best['checkin'])) { $best = $b; } }
        $b = $best ? $best : array('id' => 'minta', 'name' => 'Vendég', 'checkin' => add_days(today(), 7), 'checkout' => add_days(today(), 10), 'email' => '');
        list($ok, $msg) = mail_guest_programs($db, $b, $s['notify_email']);
        out(array('ok' => $ok, 'message' => $ok ? 'Próba programlevél (' . hu_date($b['checkin']) . ' – ' . hu_date($b['checkout']) . ') elküldve ide: ' . $s['notify_email'] : $msg));
    }
    $b = $db['bookings'][$i];
    if (empty($b['email'])) { fail('Ennél a foglalásnál nincs e-mail cím.'); }
    list($ok, $msg) = mail_guest_programs($db, $b);
    if ($ok) { $db['bookings'][$i]['ev_sent'] = today(); $db['bookings'][$i]['log'][] = array('t' => time(), 's' => $b['status'], 'u' => 'tulajdonos', 'x' => 'Programlevél elküldve'); db_save($db); }
    out(array('ok' => $ok, 'message' => $msg, 'link' => guest_link($b)));

case 'guest_ev_preview':   /* tulajdonos: mit kapna a vendég (oldal-link) */
    $db = db_load(); require_admin($db);
    $i = find_idx($db, isset($P['id']) ? (string) $P['id'] : (isset($_GET['id']) ? (string) $_GET['id'] : ''));
    if ($i < 0) { fail('Nincs ilyen foglalás.', 404); }
    out(array('ok' => true, 'link' => guest_link($db['bookings'][$i]), 'count' => count(guest_events($db, $db['bookings'][$i]))));

case 'teendok_ical':
    $db = db_load();
    if (!hash_equals((string) $db['settings']['ical_key'], isset($_GET['key']) ? (string) $_GET['key'] : '')) { fail('Hozzáférés megtagadva.', 403); }
    header('Content-Type: text/calendar; charset=utf-8');
    header('Content-Disposition: inline; filename="zephyr-teendok.ics"');
    echo teendok_ical($db); exit;

default:
    fail('Ismeretlen kérés.', 404);
}
