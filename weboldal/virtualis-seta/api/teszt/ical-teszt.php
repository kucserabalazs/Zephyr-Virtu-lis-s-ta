<?php
/* iCal-szinkron tesztek MINTAADATON (a tulajdonos 10 pontos listája szerint) – futtatás: php api/teszt/ical-teszt.php
   Élő adatot nem érint: ideiglenes adatbázissal dolgozik, a platformokat nem hívja. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('ZB_TEST', 1);
require __DIR__ . '/../index.php';
$GLOBALS['ZB_MAILS'] = array();
$pass = 0; $failn = 0;
function ok($c, $msg) { global $pass, $failn; if ($c) { $pass++; echo "  ✓ $msg\n"; } else { $failn++; echo "  ✗ HIBA: $msg\n"; } }
function vev($uid, $s, $e, $sum, $desc = '', $p = ';VALUE=DATE') { return "BEGIN:VEVENT\r\nDTSTART$p:$s\r\nDTEND$p:$e\r\nUID:$uid\r\n" . ($desc ? "DESCRIPTION:$desc\r\n" : '') . "SUMMARY:$sum\r\nEND:VEVENT\r\n"; }
function cal($evs) { return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:teszt\r\n" . implode('', $evs) . "END:VCALENDAR\r\n"; }
function fresh() { return array('settings' => array_merge(defaults(), array('notify_email' => 'teszt@example.com', 'ext_ignored' => array())), 'bookings' => array()); }
function ext($db, $src) { return array_values(array_filter($db['bookings'], function ($b) use ($src) { return isset($b['source']) && $b['source'] === $src; })); }
$AIR_RES = 'Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMABC123\nPhone Number (Last 4 Digits): 1234';

echo "1. Foglalás ≠ blokk – platformonként külön szabály\n";
ok(ical_classify('airbnb', array('summary' => 'Reserved', 'desc' => $AIR_RES))[0] === 'reserved', 'Airbnb „Reserved” = valódi foglalás');
ok(ical_classify('airbnb', array('summary' => 'Airbnb (Not available)', 'desc' => ''))[0] === 'block', 'Airbnb „Not available” = blokk');
ok(ical_classify('szallas', array('summary' => '', 'desc' => ''))[0] === 'block', 'Szállás.hu üres felirat = zárt nap');
ok(ical_classify('szallas', array('summary' => 'Zárva', 'desc' => ''))[0] === 'block', 'Szállás.hu „Zárva” = zárt nap');
ok(ical_classify('szallas', array('summary' => 'Kiss Péter', 'desc' => ''))[0] === 'reserved', 'Szállás.hu névvel = valódi foglalás');
ok(ical_classify('szallas', array('summary' => 'Reserved', 'desc' => ''))[0] === 'reserved', 'egy platform szabálya nem érvényes a másikra („Reserved” a Szállás.hu-nál nem speciális)');
ok(ical_classify('egyeb', array('summary' => 'Foglalt', 'desc' => ''))[0] === 'block', 'Egyéb (saját) naptár = zárolt időszak');

echo "2. Kijelentkezési nap (DTEND nem része a foglalásnak)\n";
$GLOBALS['ZB_TODAY'] = '2027-07-01'; $db = fresh();
sync_feed($db, 'korvett', 'szallas', '', cal(array(vev('a1', '20270710', '20270712', 'Kiss Péter'), vev('a2', '20270712', '20270714', 'Nagy Anna'))));
$m = busy_map($db, 'korvett', '2027-07-09', '2027-07-15');
ok(isset($m['2027-07-10'], $m['2027-07-11']) && $m['2027-07-12']['ext_uid'] === 'szallas:a2' && !isset($m['2027-07-14']), 'váltásnapon (07-12) az érkező vendég foglal, a távozó nem; a 07-14 szabad');
ext_overlaps($db); ok(empty(array_filter($db['bookings'], function ($b) { return !empty($b['xconflict']); })), 'váltásnapon nincs hamis ütközés');

echo "3. Platformok közötti átfedés: duplikáció vs. valódi ütközés, elsőbbség\n";
$db = fresh(); $GLOBALS['ZB_MAILS'] = array();
sync_feed($db, 'dingi', 'szallas', '', cal(array(vev('s1', '20270801', '20270805', 'Kovács Béla'))));
sync_feed($db, 'dingi', 'airbnb', '', cal(array(vev('b1@airbnb.com', '20270801', '20270805', 'Airbnb (Not available)'))));
ext_overlaps($db); $air = ext($db, 'airbnb');
ok(!empty($air[0]['dup_of']) && $air[0]['dup_of'] === 'szallas', 'az Airbnb blokk a Szállás.hu foglalás tükre → duplikáció');
ok(count($GLOBALS['ZB_MAILS']) === 0, 'duplikációról nem megy riasztás');
$exp = ical_export($db, 'dingi', 'szallas', false); ok(substr_count($exp, 'BEGIN:VEVENT') === 0, 'a Szállás.hu felé nem küldjük vissza a saját foglalásának tükrét');
$exp2 = ical_export($db, 'dingi', 'airbnb', false); ok(substr_count($exp2, 'BEGIN:VEVENT') === 1, 'az Airbnb felé a Szállás.hu foglalás egyszer megy ki');
sync_feed($db, 'dingi', 'airbnb', '', cal(array(vev('b2@airbnb.com', '20270803', '20270806', 'Reserved', $AIR_RES))));
ext_overlaps($db); $x = array_filter($db['bookings'], function ($b) { return !empty($b['xconflict']); });
ok(count($x) === 2 && count($GLOBALS['ZB_MAILS']) === 1, 'két platformon valódi foglalás ugyanarra a napra → ÜTKÖZÉS + egy riasztó levél');
ext_overlaps($db); ok(count($GLOBALS['ZB_MAILS']) === 1, 'ugyanarról az ütközésről nem megy újra levél');

echo "4. Levágott kezdődátum (zsugorodó foglalás) – de ne ragadjon be elavult dátum\n";
$db = fresh(); $GLOBALS['ZB_TODAY'] = '2027-07-08';
sync_feed($db, 'fregatt', 'szallas', '', cal(array(vev('l1', '20270705', '20270715', 'Hosszú Vendég'))));
$GLOBALS['ZB_TODAY'] = '2027-07-11';
sync_feed($db, 'fregatt', 'szallas', '', cal(array(vev('l1', '20270711', '20270715', 'Hosszú Vendég'))));
$b = ext($db, 'szallas')[0]; ok($b['checkin'] === '2027-07-05', 'a platform levágta a múltat (07-11-re), a megjegyzett kezdés (07-05) marad');
$db2 = fresh(); $GLOBALS['ZB_TODAY'] = '2027-07-01';
sync_feed($db2, 'fregatt', 'szallas', '', cal(array(vev('m1', '20270720', '20270725', 'Módosító'))));
sync_feed($db2, 'fregatt', 'szallas', '', cal(array(vev('m1', '20270722', '20270726', 'Módosító'))));
$b = ext($db2, 'szallas')[0]; ok($b['checkin'] === '2027-07-22' && $b['checkout'] === '2027-07-26', 'jövőbeli valódi módosítást átvesz (nem ragad be a régi kezdés)');

echo "5. A feedből eltűnő foglalás (távozás napján / bent lévő vendég)\n";
$db = fresh(); $GLOBALS['ZB_TODAY'] = '2027-07-10';
sync_feed($db, 'kaloz', 'airbnb', '', cal(array(vev('g1', '20270710', '20270715', 'Reserved', $AIR_RES), vev('g2', '20270801', '20270803', 'Reserved', $AIR_RES))));
$GLOBALS['ZB_TODAY'] = '2027-07-15';
sync_feed($db, 'kaloz', 'airbnb', '', cal(array(vev('g2', '20270801', '20270803', 'Reserved', $AIR_RES))));
$g1 = array_values(array_filter($db['bookings'], function ($b) { return $b['ext_uid'] === 'airbnb:g1'; }));
ok(count($g1) === 1 && !empty($g1[0]['feed_gone']), 'a ma távozó vendég eltűnt a feedből → megtartva, jelölve');
sync_feed($db, 'kaloz', 'airbnb', '', cal(array(vev('g9', '20270901', '20270903', 'Reserved', $AIR_RES))));
ok(!array_filter($db['bookings'], function ($b) { return $b['ext_uid'] === 'airbnb:g2'; }) && count($db['ext_removed']) === 1, 'jövőbeli eltűnt (lemondott) foglalás → törölve, de a lomtárban visszaállítható');
$n0 = count($db['bookings']); sync_feed($db, 'kaloz', 'airbnb', '', cal(array()));
sync_feed($db, 'kaloz', 'szallas', '', cal(array(vev('z1', '20270920', '20270922', 'Valaki'), vev('z2', '20271001', '20271003', 'Valaki2'))));
$r = sync_feed($db, 'kaloz', 'szallas', '', cal(array()));
ok(count(ext($db, 'szallas')) === 2 && strpos($r['msg'], 'üres naptár') !== false, 'hirtelen üres naptár (platformhiba) → semmit nem töröl, figyelmeztet');

echo "6. Időzóna és a „mai nap”\n";
ok(ical_date('20270715', ';VALUE=DATE') === '2027-07-15', 'egész napos dátum változatlan (nem alakul időponttá)');
ok(ical_date('20270714T230000Z', '') === '2027-07-15', 'UTC időpont (23:00Z) → magyar idő szerint már 07-15');
ok(ical_date('20270715T100000', ';TZID=Europe/Budapest') === '2027-07-15', 'TZID-s időpont helyi napja');
ok(nights('2027-03-27', '2027-03-29') === 2 && add_days('2027-10-30', 1) === '2027-10-31', 'óraátállításkor sem csúszik a napszámítás');

echo "\nEredmény: $pass rendben, $failn hiba\n";
exit($failn ? 1 : 0);
