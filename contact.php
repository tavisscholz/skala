<?php
/* Contact form handler for buildwithskala.com on Hostinger.
   Accepts a JSON or form POST from the homepage form, sends it by email
   through PHP mail(), and answers {"ok": true|false}. The page falls back
   to a copyable draft when this answers anything but ok. */
declare(strict_types=1);

const TO      = 'tavis@buildwithskala.com';
const FROM    = 'no-reply@buildwithskala.com';   // an address on this domain, so Hostinger's mail relay accepts it
const SUBJECT = 'SKALA inquiry';
const MAX_PER_HOUR = 6;                           // per visitor address

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function reply(bool $ok, string $reason = ''): void {
  echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'reason' => $reason]);
  exit;
}
function clean_line(string $s, int $max): string {
  $s = trim(preg_replace('/[\r\n\t]+/', ' ', $s) ?? '');
  return mb_substr($s, 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); reply(false, 'method'); }

/* Only this site may post here */
$host = $_SERVER['HTTP_HOST'] ?? '';
foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $h) {
  if (!empty($_SERVER[$h]) && $host !== '' && parse_url($_SERVER[$h], PHP_URL_HOST) !== preg_replace('/:\d+$/', '', $host)) {
    http_response_code(403); reply(false, 'origin');
  }
}

$data = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($data)) $data = $_POST;

/* Honeypot: bots fill the hidden field; pretend it worked and drop it */
if (trim((string)($data['website'] ?? '')) !== '') reply(true);

$name    = clean_line((string)($data['name'] ?? ''), 120);
$email   = clean_line((string)($data['email'] ?? ''), 200);
$company = clean_line((string)($data['company'] ?? ''), 160);
$message = trim(mb_substr((string)($data['message'] ?? ''), 0, 6000));

if ($name === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(422); reply(false, 'fields'); }

/* Light flood guard: a small per-address counter in the temp dir */
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$stamp = sys_get_temp_dir() . '/skala-contact-' . hash('sha256', $ip) . '.json';
$log = @json_decode((string)@file_get_contents($stamp), true);
$log = is_array($log) ? array_values(array_filter($log, fn($t) => $t > time() - 3600)) : [];
if (count($log) >= MAX_PER_HOUR) { http_response_code(429); reply(false, 'rate'); }
$log[] = time();
@file_put_contents($stamp, json_encode($log));

$when = date('D j M Y, H:i T');
$body = implode("\n", [
  "Name: $name",
  "Work email: $email",
  "Company: " . ($company !== '' ? $company : '—'),
  '',
  'What they are working toward:',
  $message,
  '',
  '—',
  "Sent from the buildwithskala.com contact form, $when",
]);

$safeName = str_replace(['"', '<', '>'], '', $name);
$headers = [
  'From: SKALA website <' . FROM . '>',
  'Reply-To: ' . $safeName . ' <' . $email . '>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: 8bit',
  'X-Mailer: buildwithskala.com',
];
$subject = mb_encode_mimeheader(SUBJECT . ' from ' . $safeName, 'UTF-8');

$sent = @mail(TO, $subject, $body, implode("\r\n", $headers), '-f' . FROM);
if (!$sent) { http_response_code(502); reply(false, 'mail'); }
reply(true);
