<?php
/* Sendet Vorder-/Rückseite des Führerscheins an die Claude Vision API und
 * liefert strukturierte Felder zurück. Die Bilder werden hier NICHT
 * gespeichert - sie existieren nur für die Dauer dieses Requests im
 * PHP-Prozessspeicher (Löschkonzept).
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';

const FS_OCR_TOOL_NAME = 'fuehrerschein_daten_erfassen';

function fs_ocr_tool_schema(): array {
  return [
    'name' => FS_OCR_TOOL_NAME,
    'description' => 'Erfasst die strukturierten Felder eines deutschen/EU-Führerscheins aus den Fotos.',
    'input_schema' => [
      'type' => 'object',
      'properties' => [
        'vorname' => ['type' => ['string', 'null']],
        'nachname' => ['type' => ['string', 'null']],
        'geburtsdatum' => ['type' => ['string', 'null'], 'description' => 'ISO-8601, z.B. 1990-05-14'],
        'geburtsort' => ['type' => ['string', 'null']],
        'adresse' => ['type' => ['string', 'null'], 'description' => 'Nur falls auf dem Führerschein vermerkt'],
        'fuehrerscheinNummer' => ['type' => ['string', 'null']],
        'ausstellendeBehoerde' => ['type' => ['string', 'null']],
        'ausstellungsdatum' => ['type' => ['string', 'null'], 'description' => 'ISO-8601 des Dokuments (Feld 4a)'],
        'klassen' => [
          'type' => 'array',
          'items' => [
            'type' => 'object',
            'properties' => [
              'klasse' => ['type' => 'string', 'description' => 'z.B. B, BE, A1, C1'],
              'ausstellungsdatum' => ['type' => ['string', 'null']],
              'ablaufdatum' => ['type' => ['string', 'null']],
            ],
            'required' => ['klasse', 'ausstellungsdatum', 'ablaufdatum'],
          ],
        ],
        'hinweise' => ['type' => ['string', 'null'], 'description' => "Kurzer Hinweis, falls Felder unleserlich/unsicher sind"],
      ],
      'required' => [
        'vorname', 'nachname', 'geburtsdatum', 'geburtsort', 'adresse',
        'fuehrerscheinNummer', 'ausstellendeBehoerde', 'ausstellungsdatum', 'klassen', 'hinweise',
      ],
    ],
  ];
}

function fs_ocr_media_type_aus_data_url(string $dataUrl): array {
  if (!preg_match('/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/', $dataUrl, $matches)) {
    fs_json_error('ungueltiges_bildformat', 400, 'Ungültiges Bildformat. Erwartet wird ein JPEG/PNG/WEBP als Data-URL.');
  }
  return ['media_type' => $matches[1], 'base64' => $matches[2]];
}

/**
 * @return array Die von Claude extrahierten Felder (bereits als PHP-Array,
 *   direkt aus dem tool_use-Input der Anthropic-API-Antwort).
 */
function fs_fuehrerschein_extrahieren(string $vorderseiteDataUrl, ?string $rueckseiteDataUrl): array {
  $cfg = fs_config();
  $apiKey = (string) ($cfg['ANTHROPIC_API_KEY'] ?? '');
  if ($apiKey === '') {
    fs_json_error('server_nicht_konfiguriert', 500, 'ANTHROPIC_API_KEY ist nicht gesetzt.');
  }
  $model = (string) ($cfg['ANTHROPIC_MODEL'] ?? 'claude-sonnet-5');

  $bilder = [];
  $vorderseite = fs_ocr_media_type_aus_data_url($vorderseiteDataUrl);
  $bilder[] = [
    'type' => 'image',
    'source' => ['type' => 'base64', 'media_type' => $vorderseite['media_type'], 'data' => $vorderseite['base64']],
  ];
  if ($rueckseiteDataUrl) {
    $rueckseite = fs_ocr_media_type_aus_data_url($rueckseiteDataUrl);
    $bilder[] = [
      'type' => 'image',
      'source' => ['type' => 'base64', 'media_type' => $rueckseite['media_type'], 'data' => $rueckseite['base64']],
    ];
  }

  $payload = [
    'model' => $model,
    'max_tokens' => 1024,
    'tools' => [fs_ocr_tool_schema()],
    'tool_choice' => ['type' => 'tool', 'name' => FS_OCR_TOOL_NAME],
    'messages' => [
      [
        'role' => 'user',
        'content' => array_merge($bilder, [[
          'type' => 'text',
          'text' => 'Lies die Felder dieses Führerscheins aus den Fotos aus und rufe ausschließlich das ' .
            "Werkzeug zur Datenerfassung auf. Erfinde keine Werte - wenn ein Feld nicht lesbar ist, " .
            "trage null ein und nenne es kurz in 'hinweise'.",
        ]]),
      ],
    ],
  ];

  $ch = curl_init('https://api.anthropic.com/v1/messages');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'x-api-key: ' . $apiKey,
      'anthropic-version: 2023-06-01',
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 30,
  ]);
  $responseBody = curl_exec($ch);
  $curlError = curl_error($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($responseBody === false) {
    fs_json_error('ocr_verbindungsfehler', 502, 'Verbindung zur Datenextraktion fehlgeschlagen: ' . $curlError);
  }
  $response = json_decode($responseBody, true);
  if ($status >= 400 || !is_array($response)) {
    $message = is_array($response) && isset($response['error']['message']) ? $response['error']['message'] : $responseBody;
    fs_json_error('ocr_fehlgeschlagen', 502, 'Datenextraktion fehlgeschlagen: ' . $message);
  }

  foreach (($response['content'] ?? []) as $block) {
    if (($block['type'] ?? '') === 'tool_use') {
      return $block['input'] ?? [];
    }
  }

  fs_json_error('ocr_kein_ergebnis', 502, 'Die Datenextraktion hat kein strukturiertes Ergebnis geliefert.');
}
