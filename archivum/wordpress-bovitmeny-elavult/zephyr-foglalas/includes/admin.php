<?php
if (!defined('ABSPATH')) exit;

add_action('admin_menu', function () {
    $pending = 0;
    global $wpdb;
    if (get_option('zf_db_ver')) $pending = (int) $wpdb->get_var('SELECT COUNT(*) FROM ' . zf_t('bookings') . " WHERE status='pending'");
    $badge = $pending ? ' <span class="awaiting-mod">' . $pending . '</span>' : '';
    add_menu_page('Zephyr foglalás', 'Zephyr foglalás' . $badge, 'manage_options', 'zephyr-foglalas', 'zf_admin_page', 'dashicons-calendar-alt', 3);
});

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_zephyr-foglalas') return;
    wp_enqueue_style('zf-admin', ZF_URL . 'assets/admin.css', [], ZF_VER);
    wp_enqueue_script('zf-admin', ZF_URL . 'assets/admin.js', [], ZF_VER, true);
    wp_localize_script('zf-admin', 'ZF_ADMIN', ['api' => esc_url_raw(rest_url('zephyr/v1')), 'nonce' => wp_create_nonce('wp_rest'), 'today' => zf_today()]);
});

function zf_admin_page() {
    if (!current_user_can('manage_options')) wp_die('Nincs jogosultság.');
    echo '<div class="wrap zf-wrap"><div id="zf-admin"><p>Betöltés…</p></div></div>';
}

/* Irányítópult-widget: közelgő érkezések */
add_action('wp_dashboard_setup', function () {
    if (!current_user_can('manage_options')) return;
    wp_add_dashboard_widget('zf_dash', 'Zephyr – közelgő érkezések', function () {
        global $wpdb;
        $rows = $wpdb->get_results($wpdb->prepare('SELECT * FROM ' . zf_t('bookings') . " WHERE checkin>=%s AND status IN ('pending','confirmed','external') ORDER BY checkin LIMIT 8", zf_today()), ARRAY_A);
        if (!$rows) { echo '<p>Nincs közelgő érkezés.</p>'; return; }
        $apts = zf_settings()['apartments'];
        echo '<table class="widefat striped"><tbody>';
        foreach ($rows as $b) echo '<tr><td>' . esc_html($b['checkin']) . '</td><td><b>' . esc_html($apts[$b['apt']]['name'] ?? $b['apt']) . '</b></td><td>' . esc_html($b['status'] === 'external' ? zf_source_label($b['source']) : $b['name']) . '</td><td>' . esc_html(zf_status_label($b['status'])) . '</td></tr>';
        echo '</tbody></table><p><a class="button button-primary" href="' . esc_url(admin_url('admin.php?page=zephyr-foglalas')) . '">Foglalási naptár</a></p>';
    });
});
