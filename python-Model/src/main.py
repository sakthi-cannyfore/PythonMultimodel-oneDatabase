import os
import duckdb
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer, util
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

app = Flask(__name__)

DB_PATH = r"C:\Users\Sakthi\Desktop\Shadow\Sowi\python\rag_db.duckdb"
EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2")


def reset_db():
    """Delete old DB and recreate"""
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    conn = duckdb.connect(DB_PATH)
    conn.execute("CREATE TABLE chunks (chunk TEXT, embedding BLOB)")
    conn.close()


@app.route("/upload", methods=["POST"])
def upload_csv():
    """Upload CSV, chunk text, store embeddings"""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Upload a CSV file"}), 400

    reset_db()

    df = pd.read_csv(file)
    text_data = " ".join(df.astype(str).fillna("").values.flatten())

    chunk_size = 500
    chunks = [text_data[i:i + chunk_size] for i in range(0, len(text_data), chunk_size)]
    embeddings = EMBED_MODEL.encode(chunks, convert_to_numpy=True)

    conn = duckdb.connect(DB_PATH)
    for chunk, emb in zip(chunks, embeddings):
        conn.execute("INSERT INTO chunks VALUES (?, ?)", [chunk, emb.tobytes()])
    conn.close()

    return jsonify({"message": f"✅ Uploaded {len(chunks)} chunks successfully"}), 200


@app.route("/ask", methods=["POST"])
def ask_question():
    """Query and get response from Gemini"""
    data = request.get_json()
    question = data.get("question", "").strip()
    if not question:
        return jsonify({"error": "Question is required"}), 400

    conn = duckdb.connect(DB_PATH)
    rows = conn.execute("SELECT chunk, embedding FROM chunks").fetchall()
    conn.close()

    if not rows:
        return jsonify({"error": "No data available. Upload a CSV first."}), 400

    chunks, embeddings = [], []
    for chunk, emb_blob in rows:
        chunks.append(chunk)
        embeddings.append(np.frombuffer(emb_blob, dtype=np.float32))

    question_emb = EMBED_MODEL.encode([question], convert_to_numpy=True)[0]
    cos_sims = util.cos_sim(question_emb, np.vstack(embeddings))[0].cpu().numpy()
    top_idxs = np.argsort(cos_sims)[-3:][::-1]
    top_chunks = [chunks[i] for i in top_idxs]
    context = "\n".join(top_chunks)

    prompt = f"""
    You are a helpful assistant.
    Use the following context to answer the question clearly and concisely.

    Context:
    {context}

    Question: {question}
    """

    model = genai.GenerativeModel(model_name="gemini-2.5-flash")

    try:
        response = model.generate_content([prompt])
        answer = response.text.strip() if response.text else "No answer generated."
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    reset_db()
    app.run(host="0.0.0.0", port=7000,)
