<?php
if (!defined('ABSPATH')) exit;

function zf_mail($to, $subject, $html) {
    $s = zf_settings();
    $headers = ['Content-Type: text/html; charset=UTF-8', 'From: Zephyr Apartmanház <' . sanitize_email(get_option('admin_email')) . '>'];
    if (!empty($s['owner_email'])) $headers[] = 'Reply-To: ' . sanitize_email($s['owner_email']);
    return wp_mail($to, $subject, zf_mail_wrap($html), $headers);
}
function zf_mail_wrap($inner) {
    $s = zf_settings();
    return '<!doctype html><html><body style="margin:0;background:#f3efe4;font-family:Arial,Helvetica,sans-serif;color:#14202a">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">'
        . '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden">'
        . '<tr><td style="background:#0b2f5e;padding:22px 28px;color:#f2d27a;font:800 24px Georgia,serif;letter-spacing:.12em">ZEPHYR <span style="font:700 12px Arial;letter-spacing:.25em;color:#fff">APARTMANHÁZ · ZAMÁRDI</span></td></tr>'
        . '<tr><td style="padding:26px 28px;font-size:15px;line-height:1.55">' . $inner . '</td></tr>'
        . '<tr><td style="background:#f8f5ec;padding:16px 28px;font-size:12.5px;color:#5b6770">' . esc_html($s['address']) . ' · ' . esc_html($s['phone']) . ' · ' . esc_html($s['owner_email']) . '</td></tr>'
        . '</table></td></tr></table></body></html>';
}
function zf_mail_breakdown($b) {
    $s = zf_settings(); $an = $s['apartments'][$b['apt']]['name'] ?? $b['apt'];
    $q = zf_quote($b['apt'], $b['checkin'], $b['checkout'], $b['adults'], $b['children']);
    $rows = '';
    if (!is_wp_error($q)) foreach ($q['per_night'] as $n) $rows .= '<tr><td style="padding:3px 0;color:#5b6770">' . esc_html(zf_hu_date($n['d'])) . ' éjszaka</td><td align="right">' . zf_money($n['p']) . '</td></tr>';
    $tr = function ($a, $b2, $bold = false) { return '<tr><td style="padding:6px 0;border-top:1px solid #eee' . ($bold ? ';font-weight:800' : '') . '">' . $a . '</td><td align="right" style="padding:6px 0;border-top:1px solid #eee' . ($bold ? ';font-weight:800' : '') . '">' . $b2 . '</td></tr>'; };
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:12px 0 4px">'
        . $tr('Apartman', '<b>' . esc_html((($s['apartments'][$b['apt']]['no'] ?? '') . ' · ' . $an)) . '</b>')
        . $tr('Érkezés', esc_html(zf_hu_date($b['checkin']) . ' ' . $s['checkin'] . '-tól'))
        . $tr('Távozás', esc_html(zf_hu_date($b['checkout']) . ' ' . $s['checkout'] . '-ig'))
        . $tr('Vendégek', (int) $b['adults'] . ' felnőtt' . ((int) $b['children'] ? ', ' . (int) $b['children'] . ' gyermek (18 év alatt)' : ''))
        . '<tr><td colspan="2" style="padding-top:8px"><table width="100%" style="font-size:13px">' . $rows . '</table></td></tr>'
        . $tr('Szállásdíj (' . (int) $b['nights'] . ' éj)', zf_money($b['price_total']))
        . $tr('Idegenforgalmi adó (' . (int) $b['adults'] . ' fő × ' . (int) $b['nights'] . ' éj × ' . zf_money($s['tax']) . ')', zf_money($b['tax_total']))
        . $tr('Végösszeg', zf_money($b['grand_total']), true)
        . $tr('Előleg (' . (int) $s['deposit_pct'] . '%)', zf_money($b['deposit']), true)
        . $tr('Fennmaradó összeg érkezéskor', zf_money((int) $b['grand_total'] - (int) $b['deposit']))
        . '</table>';
}
function zf_bank_block($b) {
    $s = zf_settings();
    if (!$s['bank_account'] && !$s['bank_iban']) return '<p>Az előleg befizetéséhez szükséges banki adatokat külön e-mailben küldjük.</p>';
    $ref = 'ZEPHYR-' . (int) $b['id'];
    return '<div style="background:#f8f5ec;border-radius:10px;padding:14px 16px;margin:12px 0;font-size:14px">'
        . '<b>Előleg átutalása</b><br>Kedvezményezett: ' . esc_html($s['bank_holder']) . '<br>'
        . ($s['bank_name'] ? 'Bank: ' . esc_html($s['bank_name']) . '<br>' : '')
        . ($s['bank_account'] ? 'Számlaszám: <b>' . esc_html($s['bank_account']) . '</b><br>' : '')
        . ($s['bank_iban'] ? 'IBAN: ' . esc_html($s['bank_iban']) . ($s['bank_swift'] ? ' · SWIFT: ' . esc_html($s['bank_swift']) : '') . '<br>' : '')
        . 'Összeg: <b>' . zf_money($b['deposit']) . '</b><br>Közlemény: <b>' . esc_html($ref) . '</b><br>'
        . 'Határidő: <b>' . esc_html(zf_hu_date(zf_add_days(zf_today(), (int) $s['deposit_days']))) . '</b></div>';
}
function zf_mail_request($b) {  /* vendég: kérés beérkezett */
    $html = '<h2 style="margin:0 0 8px;color:#0b2f5e">Köszönjük foglalási kérését!</h2>'
        . '<p>Kedves ' . esc_html($b['name']) . '!</p><p>Foglalási kérését megkaptuk, a kiválasztott napokat <b>ideiglenesen lefoglaltuk</b> Önnek. Hamarosan ellenőrizzük, és visszaigazoló e-mailt küldünk az előleg befizetéséhez szükséges adatokkal. A foglalás az előleg beérkezésével válik véglegessé.</p>'
        . zf_mail_breakdown($b)
        . '<p style="font-size:13px;color:#5b6770">Foglalási azonosító: <b>ZEPHYR-' . (int) $b['id'] . '</b>. Érkezéskor kérjük, minden vendég (gyermekek is) hozza magával fényképes igazolványát (VIZA-nyilvántartás).</p>';
    return zf_mail($b['email'], 'Foglalási kérés beérkezett – Zephyr Apartmanház (ZEPHYR-' . (int) $b['id'] . ')', $html);
}
function zf_mail_owner_new($b) {
    $s = zf_settings(); $an = $s['apartments'][$b['apt']]['name'] ?? $b['apt'];
    $link = admin_url('admin.php?page=zephyr-foglalas#foglalas-' . (int) $b['id']);
    $html = '<h2 style="margin:0 0 8px;color:#0b2f5e">Új foglalási kérés: ' . esc_html($an) . '</h2>'
        . '<p><b>' . esc_html($b['name']) . '</b> · ' . esc_html($b['phone']) . ' · ' . esc_html($b['email']) . '</p>'
        . zf_mail_breakdown($b)
        . ($b['guest_note'] ? '<p><b>Vendég üzenete:</b> ' . nl2br(esc_html($b['guest_note'])) . '</p>' : '')
        . '<p><a href="' . esc_url($link) . '" style="display:inline-block;background:#0b2f5e;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Megnyitás az adminfelületen</a></p>';
    return zf_mail($s['owner_email'], 'Új foglalás: ' . $an . ' ' . $b['checkin'] . ' – ' . $b['checkout'] . ' (' . $b['name'] . ')', $html);
}
function zf_mail_confirmed($b) {
    $s = zf_settings();
    $html = '<h2 style="margin:0 0 8px;color:#2e7d32">Foglalását visszaigazoljuk!</h2>'
        . '<p>Kedves ' . esc_html($b['name']) . '!</p><p>Örömmel visszaigazoljuk foglalását. Kérjük, az előleget az alábbi adatokkal utalja át – a foglalás az előleg beérkezésével válik véglegessé.</p>'
        . zf_mail_breakdown($b) . zf_bank_block($b)
        . '<p>Érkezés: ' . esc_html($s['checkin']) . ' órától · Távozás: ' . esc_html($s['checkout']) . ' óráig<br>Cím: ' . esc_html($s['address']) . '</p>'
        . '<p style="font-size:13px;color:#5b6770">Az idegenforgalmi adót (18 év felett ' . zf_money($s['tax']) . ' / fő / éj) a végösszeg tartalmazza. Érkezéskor minden vendégnek fényképes igazolvány szükséges.</p>'
        . '<p>Szeretettel várjuk a Balatonnál!<br>' . esc_html($s['owner_name']) . '</p>';
    return zf_mail($b['email'], 'Foglalás visszaigazolva – Zephyr Apartmanház (ZEPHYR-' . (int) $b['id'] . ')', $html);
}
function zf_mail_cancelled($b) {
    $html = '<h2 style="margin:0 0 8px;color:#c62828">Foglalás törölve</h2><p>Kedves ' . esc_html($b['name']) . '!</p><p>Tájékoztatjuk, hogy a(z) ZEPHYR-' . (int) $b['id'] . ' azonosítójú foglalás (' . esc_html(zf_hu_date($b['checkin'])) . ' – ' . esc_html(zf_hu_date($b['checkout'])) . ') törlésre került. Kérdés esetén keressen minket bizalommal.</p>';
    return zf_mail($b['email'], 'Foglalás törölve – Zephyr Apartmanház (ZEPHYR-' . (int) $b['id'] . ')', $html);
}
function zf_mail_conflict($b, $source, $e) {
    $s = zf_settings();
    $html = '<h2 style="margin:0 0 8px;color:#c62828">Figyelem: foglalási ütközés!</h2><p>A(z) ' . esc_html(zf_source_label($source)) . ' naptárában új foglalás jelent meg (' . esc_html($e['start'] . ' – ' . $e['end']) . '), amely ütközik a ZEPHYR-' . (int) $b['id'] . ' foglalással (' . esc_html($b['name']) . ', ' . esc_html($b['checkin'] . ' – ' . $b['checkout']) . '). Kérjük, ellenőrizze!</p>';
    return zf_mail($s['owner_email'], 'ÜTKÖZÉS: ' . ($s['apartments'][$b['apt']]['name'] ?? $b['apt']) . ' ' . $e['start'], $html);
}
