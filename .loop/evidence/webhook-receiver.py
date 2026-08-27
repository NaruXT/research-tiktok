import hmac, hashlib, time, json, os
from flask import Flask, request, abort

app = Flask(__name__)
CLIENT_SECRET = os.environ["TIKTOK_CLIENT_SECRET"]
EVIDENCE_FILE = os.path.join(os.path.dirname(__file__), "webhook-received.raw.jsonl")


def verify_signature(raw_body: bytes, signature_header: str) -> bool:
    try:
        parts = dict(p.split("=", 1) for p in signature_header.split(","))
        timestamp, sig = parts["t"], parts["s"]
    except (KeyError, ValueError):
        return False

    if abs(time.time() - int(timestamp)) > 300:
        return False

    signed_payload = f"{timestamp}.{raw_body.decode()}"
    expected = hmac.new(CLIENT_SECRET.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)


@app.route("/tiktok/webhook", methods=["POST"])
def tiktok_webhook():
    signature = request.headers.get("TikTok-Signature", "")
    raw_body = request.get_data()
    sig_ok = verify_signature(raw_body, signature)

    record = {
        "received_at": time.time(),
        "signature_header": signature,
        "signature_valid": sig_ok,
        "body": request.get_json(silent=True),
    }
    with open(EVIDENCE_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")

    if not sig_ok:
        abort(401)

    return "", 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8787)
