<?php
if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    $ns = 'zephyr/v1';
    $pub = '__return_true';
    $adm = function () { return current_user_can('manage_options'); };
    register_rest_route($ns, '/config', ['methods' => 'GET', 'callback' => 'zf_r_config', 'permission_callback' => $pub]);
    register_rest_route($ns, '/availability', ['methods' => 'GET', 'callback' => 'zf_r_availability', 'permission_callback' => $pub]);
    register_rest_route($ns, '/quote', ['methods' => 'POST', 'callback' => 'zf_r_quote', 'permission_callback' => $pub]);
    register_rest_route($ns, '/book', ['methods' => 'POST', 'callback' => 'zf_r_book', 'permission_callback' => $pub]);
    register_rest_route($ns, '/ical/(?P<apt>[a-z]+)', ['methods' => 'GET', 'callback' => 'zf_r_ical', 'permission_callback' => $pub]);
    /* admin */
    register_rest_route($ns, '/admin/bookings', [
        ['methods' => 'GET', 'callback' => 'zf_ra_list', 'permission_callback' => $adm],
        ['methods' => 'POST', 'callback' => 'zf_ra_create', 'permission_callback' => $adm],
    ]);
    register_rest_route($ns, '/admin/bookings/(?P<id>\d+)', [
        ['methods' => 'GET', 'callback' => 'zf_ra_get', 'permission_callback' => $adm],
        ['methods' => 'POST', 'callback' => 'zf_ra_update', 'permission_callback' => $adm],
        ['methods' => 'DELETE', 'callback' => 'zf_ra_delete', 'permission_callback' => $adm],
    ]);
    register_rest_route($ns, '/admin/calendar', ['methods' => 'GET', 'callback' => 'zf_ra_calendar', 'permission_callback' => $adm]);
    register_rest_route($ns, '/admin/block', ['methods' => 'POST', 'callback' => 'zf_ra_block', 'permission_callback' => $adm]);
    register_rest_route($ns, '/admin/prices', ['methods' => 'POST', 'callback' => 'zf_ra_prices', 'permission_callback' => $adm]);
    register_rest_route($ns, '/admin/settings', [
        ['methods' => 'GET', 'callback' => 'zf_ra_settings', 'permission_callback' => $adm],
        ['methods' => 'POST', 'callback' => 'zf_ra_settings_save', 'permission_callback' => $adm],
    ]);
    register_rest_route($ns, '/admin/sync', ['methods' => 'POST', 'callback' => 'zf_ra_sync', 'permission_callback' => $adm]);
    register_rest_route($ns, '/admin/quote', ['methods' => 'POST', 'callback' => 'zf_r_quote', 'permission_callback' => $adm]);
});

/* CORS, ha a túra más domainen fut */
add_filter('rest_pre_serve_request', function ($served, $result, $request) {
    if (strpos($request->get_route(), '/zephyr/v1/') !== 0 || strpos($request->get_route(), '/zephyr/v1/admin') === 0) return $served;
    $origin = get_http_origin();
    $allowed = array_filter(array_map('trim', explode(',', (string) zf_settings()['allowed_origins'])));
    if ($origin && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }
    return $served;
}, 10, 3);

function zf_r_config() {
    $s = zf_settings(); $apts = [];
    foreach (zf_apts() as $k => $a) $apts[] = ['id' => $k, 'name' => $a['name'], 'no' => (int) $a['no'], 'cap' => (int) $a['cap'], 'price' => (int) $a['price'], 'color' => $a['color']];
    return ['apartments' => $apts, 'tax' => (int) $s['tax'], 'deposit_pct' => (int) $s['deposit_pct'], 'min_nights' => (int) $s['min_nights'], 'max_nights' => (int) $s['max_nights'],
        'checkin' => $s['checkin'], 'checkout' => $s['checkout'], 'today' => zf_today(), 'lead_days' => (int) $s['lead_days'], 'horizon_days' => (int) $s['horizon_days'],
        'rules_url' => $s['rules_url'], 'privacy_url' => $s['privacy_url'], 'phone' => $s['phone'], 'email' => $s['owner_email'], 'address' => $s['address']];
}
function zf_r_availability(WP_REST_Request $r) {
    $apt = sanitize_key($r['apt']); $from = (string) $r['from']; $to = (string) $r['to'];
    if (!isset(zf_apts()[$apt])) return new WP_Error('apt', 'Ismeretlen apartman.', ['status' => 400]);
    if (!zf_valid_date($from) || !zf_valid_date($to) || $to <= $from || zf_diff_days($from, $to) > 430) return new WP_Error('date', 'Érvénytelen időszak.', ['status' => 400]);
    return ['apt' => $apt, 'days' => zf_availability($apt, $from, $to)];
}
function zf_r_quote(WP_REST_Request $r) {
    $p = $r->get_json_params() ?: $r->get_params();
    $q = zf_quote(sanitize_key($p['apt'] ?? ''), (string) ($p['checkin'] ?? ''), (string) ($p['checkout'] ?? ''), (int) ($p['adults'] ?? 1), (int) ($p['children'] ?? 0));
    if (is_wp_error($q)) { $q->add_data(['status' => 400]); return $q; }
    $q['free'] = zf_is_free($q['apt'], $q['checkin'], $q['checkout'], (int) ($p['exclude'] ?? 0));
    return $q;
}
function zf_client_ip() { return substr(preg_replace('/[^0-9a-fA-F:.,]/', '', (string) ($_SERVER['REMOTE_ADDR'] ?? '')), 0, 64); }

function zf_r_book(WP_REST_Request $r) {
    $p = $r->get_json_params() ?: [];
    $err = function ($code, $msg) { return new WP_Error($code, $msg, ['status' => 400]); };
    if (!empty($p['website'])) return $err('spam', 'Hiba történt.');                         // csapda-mező
    $ip = zf_client_ip(); $rk = 'zf_rl_' . md5($ip); $cnt = (int) get_transient($rk);
    if ($cnt >= 6) return new WP_Error('rate', 'Túl sok próbálkozás. Kérjük, próbálja újra később, vagy hívjon minket.', ['status' => 429]);
    set_transient($rk, $cnt + 1, HOUR_IN_SECONDS);

    $apt = sanitize_key($p['apt'] ?? ''); $ci = (string) ($p['checkin'] ?? ''); $co = (string) ($p['checkout'] ?? '');
    $ad = (int) ($p['adults'] ?? 0); $ch = (int) ($p['children'] ?? 0);
    $q = zf_quote($apt, $ci, $co, $ad, $ch);
    if (is_wp_error($q)) return $err('quote', $q->get_error_message());
    $rule = zf_check_rules($apt, $ci, $co, $ad, $ch);
    if (is_wp_error($rule)) return $err('rule', $rule->get_error_message());

    $name = sanitize_text_field($p['name'] ?? ''); $email = sanitize_email($p['email'] ?? ''); $phone = sanitize_text_field($p['phone'] ?? '');
    $bplace = sanitize_text_field($p['birth_place'] ?? ''); $bdate = (string) ($p['birth_date'] ?? ''); $idd = strtoupper(preg_replace('/\s+/', '', sanitize_text_field($p['id_doc'] ?? '')));
    $note = sanitize_textarea_field($p['note'] ?? '');
    if (mb_strlen($name) < 4 || strpos($name, ' ') === false) return $err('name', 'Kérjük, adja meg teljes nevét (vezeték- és keresztnév).');
    if (!is_email($email)) return $err('email', 'Kérjük, érvényes e-mail címet adjon meg.');
    if (strlen(preg_replace('/\D/', '', $phone)) < 8) return $err('phone', 'Kérjük, érvényes telefonszámot adjon meg.');
    if (mb_strlen($bplace) < 2) return $err('birth_place', 'Kérjük, adja meg születési helyét.');
    if (!zf_valid_date($bdate) || $bdate > zf_add_days(zf_today(), -18 * 365) || $bdate < '1900-01-01') return $err('birth_date', 'Kérjük, adja meg születési idejét (a foglalónak nagykorúnak kell lennie).');
    if (!preg_match('/^[A-Z0-9-]{5,20}$/', $idd)) return $err('id_doc', 'Kérjük, adja meg személyi igazolványa vagy útlevele számát.');
    if (empty($p['accept'])) return $err('accept', 'A foglaláshoz el kell fogadnia a házirendet és az adatkezelési tájékoztatót.');

    if (!zf_lock($apt)) return new WP_Error('busy', 'A rendszer éppen foglalt, kérjük, próbálja újra.', ['status' => 503]);
    try {
        if (!zf_is_free($apt, $ci, $co)) return new WP_Error('taken', 'Sajnos a kiválasztott időszak időközben foglalttá vált. Kérjük, válasszon másik időpontot.', ['status' => 409]);
        $id = zf_insert_booking([
            'apt' => $apt, 'checkin' => $ci, 'checkout' => $co, 'status' => 'pending', 'source' => 'web',
            'name' => $name, 'email' => $email, 'phone' => $phone, 'birth_place' => $bplace, 'birth_date' => $bdate, 'id_doc' => $idd,
            'adults' => $ad, 'children' => $ch, 'nights' => $q['nights'], 'price_total' => $q['accommodation'], 'tax_total' => $q['tax'],
            'grand_total' => $q['total'], 'deposit' => $q['deposit'], 'guest_note' => $note, 'ip' => $ip,
        ]);
    } finally { zf_unlock($apt); }
    if (!$id) return new WP_Error('db', 'Hiba történt a mentés során. Kérjük, hívjon minket.', ['status' => 500]);
    $b = zf_get_booking($id);
    zf_mail_request($b); zf_mail_owner_new($b);
    return ['ok' => true, 'id' => $id, 'ref' => 'ZEPHYR-' . $id, 'quote' => $q, 'status' => 'pending'];
}
function zf_r_ical(WP_REST_Request $r) {
    $s = zf_settings(); $apt = sanitize_key($r['apt']);
    if (!hash_equals((string) $s['ical_key'], (string) $r->get_param('key'))) return new WP_Error('key', 'Hozzáférés megtagadva.', ['status' => 403]);
    if ($apt !== 'all' && !isset($s['apartments'][$apt])) return new WP_Error('apt', 'Ismeretlen apartman.', ['status' => 404]);
    $ics = zf_ical_export($apt, sanitize_key((string) $r->get_param('for')), (bool) $r->get_param('reszletes'));
    nocache_headers();
    header('Content-Type: text/calendar; charset=utf-8');
    header('Content-Disposition: inline; filename="zephyr-' . $apt . '.ics"');
    echo $ics; exit;
}

/* ---------- admin végpontok ---------- */
function zf_ra_list(WP_REST_Request $r) {
    global $wpdb;
    $w = ['1=1']; $a = [];
    if ($r['apt']) { $w[] = 'apt=%s'; $a[] = sanitize_key($r['apt']); }
    if ($r['status']) { $w[] = 'status=%s'; $a[] = sanitize_key($r['status']); }
    else $w[] = "status IN ('pending','confirmed','cancelled')";
    if ($r['from'] && zf_valid_date($r['from'])) { $w[] = 'checkout>%s'; $a[] = $r['from']; }
    if ($r['to'] && zf_valid_date($r['to'])) { $w[] = 'checkin<%s'; $a[] = $r['to']; }
    if ($r['q']) { $like = '%' . $wpdb->esc_like(sanitize_text_field($r['q'])) . '%'; $w[] = '(name LIKE %s OR email LIKE %s OR phone LIKE %s OR admin_note LIKE %s)'; array_push($a, $like, $like, $like, $like); }
    $sql = 'SELECT * FROM ' . zf_t('bookings') . ' WHERE ' . implode(' AND ', $w) . ' ORDER BY checkin DESC LIMIT 500';
    $rows = $wpdb->get_results($a ? $wpdb->prepare($sql, $a) : $sql, ARRAY_A);
    return array_map(function ($b) { return zf_booking_out($b, false); }, $rows);
}
function zf_ra_get(WP_REST_Request $r) {
    $b = zf_get_booking((int) $r['id']);
    return $b ? zf_booking_out($b) : new WP_Error('nf', 'Nincs ilyen foglalás.', ['status' => 404]);
}
function zf_ra_fields($p, $current = []) {
    $f = [];
    foreach (['name', 'phone', 'birth_place'] as $k) if (array_key_exists($k, $p)) $f[$k] = sanitize_text_field($p[$k]);
    if (array_key_exists('email', $p)) $f['email'] = sanitize_email($p['email']);
    if (array_key_exists('birth_date', $p)) $f['birth_date'] = zf_valid_date($p['birth_date']) ? $p['birth_date'] : '';
    if (array_key_exists('id_doc', $p)) $f['id_doc'] = strtoupper(preg_replace('/\s+/', '', sanitize_text_field($p['id_doc'])));
    foreach (['guest_note', 'admin_note'] as $k) if (array_key_exists($k, $p)) $f[$k] = sanitize_textarea_field($p[$k]);
    foreach (['adults', 'children', 'paid'] as $k) if (array_key_exists($k, $p)) $f[$k] = max(0, (int) $p[$k]);
    if (array_key_exists('apt', $p) && isset(zf_settings()['apartments'][$p['apt']])) $f['apt'] = $p['apt'];
    foreach (['checkin', 'checkout'] as $k) if (array_key_exists($k, $p) && zf_valid_date($p[$k])) $f[$k] = $p[$k];
    if (array_key_exists('status', $p) && in_array($p['status'], ['pending', 'confirmed', 'cancelled', 'blocked', 'external'], true)) $f['status'] = $p['status'];
    foreach (['price_total', 'tax_total', 'grand_total', 'deposit'] as $k) if (array_key_exists($k, $p) && $p[$k] !== '' && $p[$k] !== null) $f[$k] = (int) $p[$k];
    return $f;
}
function zf_ra_create(WP_REST_Request $r) {
    $p = $r->get_json_params() ?: [];
    $f = zf_ra_fields($p);
    if (empty($f['apt']) || empty($f['checkin']) || empty($f['checkout']) || $f['checkout'] <= $f['checkin']) return new WP_Error('data', 'Apartman és érvényes időszak szükséges.', ['status' => 400]);
    if (empty($p['force']) && !zf_is_free($f['apt'], $f['checkin'], $f['checkout'])) return new WP_Error('taken', 'Az időszak már foglalt. (Felülíráshoz jelöld be: „ütközés ellenére is mentsd”.)', ['status' => 409]);
    $calc = zf_recalc_fields($f['apt'], $f['checkin'], $f['checkout'], $f['adults'] ?? 1, $f['children'] ?? 0);
    if (!is_wp_error($calc)) $f = array_merge($calc, $f);
    $f['source'] = 'admin'; $f['status'] = $f['status'] ?? 'confirmed';
    $id = zf_insert_booking($f);
    $b = zf_get_booking($id);
    if (!empty($p['notify']) && $b['email'] && $b['status'] === 'confirmed') zf_mail_confirmed($b);
    return zf_booking_out($b);
}
function zf_ra_update(WP_REST_Request $r) {
    $id = (int) $r['id']; $b = zf_get_booking($id);
    if (!$b) return new WP_Error('nf', 'Nincs ilyen foglalás.', ['status' => 404]);
    $p = $r->get_json_params() ?: [];
    $f = zf_ra_fields($p);
    $n = array_merge($b, $f);
    if ($n['checkout'] <= $n['checkin']) return new WP_Error('date', 'A távozás napja az érkezés utáni legyen.', ['status' => 400]);
    $datesChanged = $n['apt'] !== $b['apt'] || $n['checkin'] !== $b['checkin'] || $n['checkout'] !== $b['checkout'];
    if (in_array($n['status'], zf_busy_statuses(), true) && ($datesChanged || !in_array($b['status'], zf_busy_statuses(), true)) && empty($p['force']) && !zf_is_free($n['apt'], $n['checkin'], $n['checkout'], $id))
        return new WP_Error('taken', 'Az új időszak ütközik egy másik foglalással. (Felülíráshoz jelöld be: „ütközés ellenére is mentsd”.)', ['status' => 409]);
    if (!empty($p['recalc']) || ($datesChanged || isset($f['adults']) || isset($f['children'])) && empty($p['keep_price'])) {
        $calc = zf_recalc_fields($n['apt'], $n['checkin'], $n['checkout'], $n['adults'], $n['children']);
        if (!is_wp_error($calc)) $f = array_merge($f, $calc);
    } elseif ($datesChanged) $f['nights'] = zf_diff_days($n['checkin'], $n['checkout']);
    zf_update_booking($id, $f);
    $nb = zf_get_booking($id);
    if (!empty($p['notify']) && $nb['email']) {
        if ($nb['status'] === 'confirmed') zf_mail_confirmed($nb);
        elseif ($nb['status'] === 'cancelled') zf_mail_cancelled($nb);
    }
    return zf_booking_out($nb);
}
function zf_ra_delete(WP_REST_Request $r) {
    global $wpdb;
    $b = zf_get_booking((int) $r['id']);
    if (!$b) return new WP_Error('nf', 'Nincs ilyen foglalás.', ['status' => 404]);
    if ($r->get_param('notify') && $b['email'] && in_array($b['status'], ['pending', 'confirmed'], true)) zf_mail_cancelled($b);
    $wpdb->delete(zf_t('bookings'), ['id' => (int) $b['id']]);
    return ['ok' => true];
}
/* Havi naptárnézet: minden apartmanra napi ár + foglalások */
function zf_ra_calendar(WP_REST_Request $r) {
    global $wpdb;
    $from = (string) $r['from']; $to = (string) $r['to'];
    if (!zf_valid_date($from) || !zf_valid_date($to) || $to <= $from || zf_diff_days($from, $to) > 120) return new WP_Error('date', 'Érvénytelen időszak.', ['status' => 400]);
    $out = [];
    foreach (zf_settings()['apartments'] as $apt => $a) {
        $map = zf_prices_map($apt, $from, $to); $prices = [];
        for ($d = $from; $d < $to; $d = zf_add_days($d, 1)) $prices[$d] = ['p' => zf_price_for($apt, $d, $map), 'custom' => isset($map[$d])];
        $rows = zf_bookings_overlapping($apt, $from, $to, ['pending', 'confirmed', 'blocked', 'external']);
        $out[$apt] = ['prices' => $prices, 'bookings' => array_map(function ($b) { return zf_booking_out($b, false); }, $rows)];
    }
    return $out;
}
function zf_ra_block(WP_REST_Request $r) {
    $p = $r->get_json_params() ?: [];
    $apt = sanitize_key($p['apt'] ?? ''); $from = (string) ($p['from'] ?? ''); $to = (string) ($p['to'] ?? '');
    if (!isset(zf_settings()['apartments'][$apt]) || !zf_valid_date($from) || !zf_valid_date($to) || $to <= $from) return new WP_Error('data', 'Hibás adatok.', ['status' => 400]);
    return ['changed' => zf_block_range($apt, $from, $to, !empty($p['open']), sanitize_textarea_field($p['note'] ?? ''))];
}
function zf_ra_prices(WP_REST_Request $r) {
    $p = $r->get_json_params() ?: [];
    $apts = (array) ($p['apts'] ?? [$p['apt'] ?? '']); $from = (string) ($p['from'] ?? ''); $to = (string) ($p['to'] ?? '');
    if (!zf_valid_date($from) || !zf_valid_date($to) || $to <= $from || zf_diff_days($from, $to) > 800) return new WP_Error('data', 'Hibás időszak.', ['status' => 400]);
    $price = (isset($p['price']) && $p['price'] !== '' && $p['price'] !== null) ? (int) $p['price'] : null;
    $wd = array_values(array_filter(array_map('intval', (array) ($p['weekdays'] ?? [])), function ($x) { return $x >= 1 && $x <= 7; }));
    $n = 0;
    foreach ($apts as $apt) { $apt = sanitize_key($apt); if (isset(zf_settings()['apartments'][$apt])) $n += zf_set_prices($apt, $from, $to, $price, $wd); }
    return ['changed' => $n];
}
function zf_ra_settings() {
    $s = zf_settings();
    $s['export'] = [];
    foreach ($s['apartments'] as $apt => $a) $s['export'][$apt] = ['airbnb' => zf_ical_url($apt, 'airbnb'), 'szallas' => zf_ical_url($apt, 'szallas'), 'altalanos' => zf_ical_url($apt)];
    $s['export']['google'] = zf_ical_url('all', '', true);
    $s['shortcode'] = '[zephyr_foglalas]';
    return $s;
}
function zf_ra_settings_save(WP_REST_Request $r) {
    $p = $r->get_json_params() ?: []; $s = zf_settings();
    foreach (['tax', 'deposit_pct', 'deposit_days', 'min_nights', 'max_nights', 'lead_days', 'horizon_days', 'pending_hours', 'retention_days'] as $k) if (isset($p[$k])) $s[$k] = max(0, (int) $p[$k]);
    foreach (['checkin', 'checkout', 'owner_name', 'phone', 'address', 'bank_name', 'bank_holder', 'bank_account', 'bank_iban', 'bank_swift', 'allowed_origins'] as $k) if (isset($p[$k])) $s[$k] = sanitize_text_field($p[$k]);
    foreach (['rules_url', 'privacy_url'] as $k) if (isset($p[$k])) $s[$k] = esc_url_raw($p[$k]);
    if (isset($p['owner_email'])) $s['owner_email'] = sanitize_email($p['owner_email']);
    if (!empty($p['regen_key'])) $s['ical_key'] = wp_generate_password(24, false, false);
    if (isset($p['apartments']) && is_array($p['apartments'])) foreach ($p['apartments'] as $apt => $a) {
        if (!isset($s['apartments'][$apt])) continue;
        $x = &$s['apartments'][$apt];
        if (isset($a['name'])) $x['name'] = sanitize_text_field($a['name']);
        if (isset($a['cap'])) $x['cap'] = max(1, (int) $a['cap']);
        if (isset($a['price'])) $x['price'] = max(0, (int) $a['price']);
        if (isset($a['active'])) $x['active'] = $a['active'] ? 1 : 0;
        if (isset($a['ical']) && is_array($a['ical'])) foreach (['airbnb', 'szallas', 'egyeb'] as $src) if (isset($a['ical'][$src])) $x['ical'][$src] = esc_url_raw(trim($a['ical'][$src]));
        unset($x);
    }
    zf_save_settings($s);
    return zf_ra_settings();
}
function zf_ra_sync() { return ['log' => zf_sync_all()]; }
