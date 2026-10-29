<?php
/**
 * Plugin Name: Zephyr Foglalás
 * Description: Online foglalási rendszer a Zephyr Apartmanházhoz: foglalási naptár, napi árak, idegenforgalmi adó, előleg, Airbnb / Szállás.hu / Google Naptár iCal szinkron, adminfelület.
 * Version: 1.0.0
 * Author: Zephyr Apartmanház
 * Text Domain: zephyr-foglalas
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) exit;

define('ZF_VER', '1.0.0');
define('ZF_DIR', plugin_dir_path(__FILE__));
define('ZF_URL', plugin_dir_url(__FILE__));

require_once ZF_DIR . 'includes/core.php';
require_once ZF_DIR . 'includes/ical.php';
require_once ZF_DIR . 'includes/mail.php';
require_once ZF_DIR . 'includes/rest.php';
require_once ZF_DIR . 'includes/admin.php';

register_activation_hook(__FILE__, 'zf_activate');
register_deactivation_hook(__FILE__, 'zf_deactivate');

function zf_activate() {
    zf_install_tables();
    zf_settings(); // alapbeállítások létrehozása
    if (!wp_next_scheduled('zf_cron_hourly')) wp_schedule_event(time() + 60, 'hourly', 'zf_cron_hourly');
}
function zf_deactivate() {
    wp_clear_scheduled_hook('zf_cron_hourly');
}

add_action('plugins_loaded', function () {
    if (get_option('zf_db_ver') !== ZF_VER) zf_install_tables();
});

/* Óránként: iCal-naptárak behúzása, lejárt függő foglalások törlése, adatmegőrzés */
add_action('zf_cron_hourly', function () {
    zf_sync_all();
    zf_expire_pending();
    zf_retention();
});

/* Rövidkód: [zephyr_foglalas] vagy [zephyr_foglalas apartman="korvett"] – foglalási gomb/felület bármely oldalon */
add_shortcode('zephyr_foglalas', function ($atts) {
    $a = shortcode_atts(['apartman' => '', 'gomb' => 'Foglalás', 'nyitva' => ''], $atts);
    zf_enqueue_widget();
    $apt = sanitize_key($a['apartman']);
    $id = 'zfw' . wp_rand(1000, 9999);
    $open = $a['nyitva'] ? 'true' : 'false';
    return '<button type="button" class="zf-open-btn" id="' . esc_attr($id) . '" data-apt="' . esc_attr($apt) . '">' . esc_html($a['gomb']) . '</button>'
        . '<script>document.addEventListener("DOMContentLoaded",function(){var b=document.getElementById("' . esc_js($id) . '");b.addEventListener("click",function(){ZephyrBooking.open({apt:b.dataset.apt});});if(' . $open . ')ZephyrBooking.open({apt:b.dataset.apt});});</script>';
});

function zf_enqueue_widget() {
    wp_enqueue_style('zf-booking', ZF_URL . 'assets/booking.css', [], ZF_VER);
    wp_enqueue_script('zf-booking', ZF_URL . 'assets/booking.js', [], ZF_VER, true);
    wp_add_inline_script('zf-booking', 'window.ZEPHYR_API=' . wp_json_encode(rest_url('zephyr/v1')) . ';', 'before');
}
