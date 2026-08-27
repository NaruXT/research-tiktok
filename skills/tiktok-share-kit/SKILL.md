---
name: tiktok-share-kit
description: Compartir contenido (video/foto) desde una app móvil nativa (iOS/Android) hacia TikTok usando el SDK Share Kit, con las herramientas de edición nativas de TikTok.
tiktok_docs:
  - https://developers.tiktok.com/docs/en/share-kit-ios-quickstart-v2
  - https://developers.tiktok.com/docs/en/share-kit-android-quickstart-v2
scopes: []
tested_e2e: false
last_verified: 2026-08-28
---

## ⚠️ Esta Skill es distinta en naturaleza a todas las anteriores

Share Kit **no es una API HTTP** - es un **SDK nativo** (iOS/Android) que se integra en el código de una app móvil compilada. No hay `curl` que lo pruebe: la única forma de probarlo E2E es tener una app iOS o Android real, con el SDK importado, corriendo en un simulador/dispositivo o build real, e interactuar con la UI. Esto está fuera del alcance de lo que este proyecto puede hacer desde una terminal - no es un checkpoint de "un click" ni de "una aprobación externa", es directamente una categoría de trabajo distinta (desarrollo de apps móviles nativas, no llamadas a una API de backend).

**Diferencia con Content Posting API** (Iteración 3): Share Kit es client-side/SDK para mobile; Content Posting API es server-side para apps web - la propia doc de TikTok lo aclara: "Looking for web-app sharing? Check out Content Posting API."

## Overview

Share Kit deja a un usuario compartir contenido (video, foto, o "Green Screen") desde una app móvil de terceros hacia TikTok, abriendo la app nativa de TikTok con herramientas de edición, efectos y hashtags pre-cargados. El flujo es 100% cliente: la app arma una request con la ruta local del contenido a compartir (`localIdentifiers`, referencias a la librería de fotos/videos del dispositivo), se la pasa al SDK, y TikTok se abre para que el usuario complete el flujo de compartir/publicar ahí.

## Scopes requeridos

No aplica el modelo de scopes de OAuth de los módulos anteriores - Share Kit no pasa por el flujo de Login Kit, es una integración de SDK a nivel de app (requiere sí un `client_key` registrado y el paquete/bundle ID de la app configurado en el Developer Portal para que TikTok reconozca la request).

## Endpoints

No hay endpoints HTTP - la integración es 100% por SDK nativo:

### iOS (`TikTokOpenShareSDK`)
```swift
import TikTokOpenShareSDK

let shareRequest = TikTokShareRequest(
    localIdentifiers: [...],      // referencias a PHAsset de la librería de fotos
    mediaType: .video,
    redirectURI: "https://www.example.com/path"  // Universal Link, no un endpoint que reciba nada del backend
)
shareRequest.send { response in
    guard let shareResponse = response as? TikTokShareResponse else { return }
    if shareResponse.errorCode == .noError {
        print("Share succeeded!")
    }
}
```

### Android
Patrón equivalente: instanciar `ShareApi`, construir el contenido como `MediaContent`, armar un `ShareRequest` (con `client_key` y package name), invocar `share()`.

## Schemas (JSON)

No hay JSON sobre HTTP - esto es la forma (illustrativa, como estructura de objeto SDK, no wire format) de la respuesta que recibe el callback de iOS, para referencia de qué campos trae:
```json
{
  "errorCode": "noError",
  "errorMessage": null,
  "shareState": "20000"
}
```

## Manejo de errores

Dos niveles de código de error documentados (iOS, confirmado equivalente en Android):

**Nivel alto** (`errorCode` del `TikTokShareResponse`): `0` éxito, `-1` error genérico (ej. red), `-2` usuario canceló en TikTok, `-3` falló la publicación, `-4` compartir denegado, `-5` no soportado.

**Nivel detallado** (`shareState`): `20000` éxito, `20001` error no clasificado, `20002` error de parseo de params, `20003` permiso no otorgado, `20004` usuario no logueado (en TikTok), `20005` sin permiso de álbum de TikTok, `20006` error de red, `20007` duración de video fuera de rango, `20008` foto no cumple requisitos, `20009` falló el chequeo de timestamp, `20010` falló procesamiento de recurso de foto, `20011` resolución de video fuera de rango, `20012` formato de video no soportado, `20013` compartir cancelado, `20014` ya hay otro video subiendo, `20015` usuario guardó como borrador, `20016` falló al publicar, `21001` falló descarga de iCloud, `21002` error interno de parseo, `21003` el recurso de media no existe.

## Ejemplo end-to-end

No aplica un ejemplo de terminal/curl - el "end-to-end" real de este módulo es: (1) registrar la app con su bundle ID/package name en el Developer Portal bajo el producto Share Kit, (2) integrar el SDK en una app iOS/Android real, (3) en un dispositivo/simulador, seleccionar contenido de la librería local y llamar `send()`/`share()`, (4) verificar que TikTok se abre con el contenido cargado y que el callback de la app recibe `errorCode`/`shareState` esperado.

## Prueba E2E realizada

**`tested_e2e: false` - fuera de alcance de este proyecto (no es un checkpoint resoluble, es otra categoría de trabajo).**

Este repo no tiene una app iOS/Android para integrar el SDK - probar esto E2E requeriría crear un proyecto Xcode/Android Studio nuevo desde cero solo para este propósito, correr un simulador o dispositivo físico, e interactuar con UI nativa. A diferencia de Research API/Data Portability (bloqueados por aprobación externa pero con la misma forma de prueba - HTTP + evidencia en `.loop/evidence/`), este módulo directamente no encaja en el patrón de prueba E2E vía terminal que usa el resto del proyecto. Documentado completo a nivel de API/SDK (parámetros, callback, códigos de error) tal como aparece en la doc oficial - eso es lo verificable sin construir una app móvil.
