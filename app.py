import pandas as pd
import json
from pymongo import MongoClient
from bson import ObjectId
import os

# 1️⃣ Connettersi a MongoDB
MONGO_URI = "mongodb+srv://Goyco2:Goycochea.2@cluster0.fivcp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "sample_flix"
COLLECTION_NAME = "commments"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# 🔹 Scegliere la fonte dati: "csv", "json" o "both"
data_source = "both"  # Cambia in "csv" o "json" se vuoi usarne solo uno

# 📌 Percorsi dei file
csv_file = "/workspace/progettone/dati_prova.csv"
json_file = "/workspace/progettone/prova.json"

# 🔄 Mapping automatico delle colonne
column_mapping = {
    "identificativo": "_id",
    "numero_crimine": "id",
    "arrestato": "arresto",
    "categoria_crimine": "tipologia",
    "data_evento": "data",
    "area_crimine": "quartiere",
    "località": "citta"
}


# 🔹 Lista per i dati unificati
all_records = []

# ✅ Funzione per filtrare i dati errati
def clean_record(record):
    """Mantiene solo i campi presenti nel column_mapping e scarta gli altri."""
    valid_keys = list(column_mapping.values())  # Otteniamo i nomi corretti
    cleaned_record = {k: v for k, v in record.items() if k in valid_keys}

    # Controlla se il record aveva campi errati
    if len(cleaned_record) != len(record):
        print(f"⚠️ Record con colonne errate scartato/parzialmente corretto: {record}")
    
    return cleaned_record

# ✅ Funzione per verificare se un record è valido (oltre all'ID deve avere altri dati)
def is_valid_record(record):
    """Verifica che il record contenga almeno un campo valido oltre a `_id`."""
    valid_data = [value for key, value in record.items() if key != "_id" and value not in [None, "", " ", []]]
    return len(valid_data) > 0

# ✅ Leggere il CSV solo se `data_source` è "csv" o "both"
if data_source in ["csv", "both"] and os.path.exists(csv_file):
    try:
        df = pd.read_csv(csv_file)
        print("✅ File CSV caricato correttamente!")

        # Rinomina colonne
        df.rename(columns=column_mapping, inplace=True)

        # Generare `_id` unici solo se non presenti
        if "_id" not in df.columns:
            df["_id"] = [ObjectId() for _ in range(len(df))]

        # Filtra i record errati
        cleaned_records = [clean_record(rec) for rec in df.to_dict(orient="records") if is_valid_record(rec)]

        # Aggiungi i record validi alla lista principale
        all_records.extend(cleaned_records)
    
    except Exception as e:
        print(f"❌ Errore durante la lettura del CSV: {e}")

# ✅ Leggere il JSON solo se `data_source` è "json" o "both"
if data_source in ["json", "both"] and os.path.exists(json_file):
    try:
        with open(json_file, "r", encoding="utf-8") as f:
            json_data = json.load(f)

        if isinstance(json_data, list):
            for doc in json_data:
                # Assicuriamoci che abbia un `_id`, altrimenti lo generiamo
                if "_id" not in doc:
                    doc["_id"] = ObjectId()

                # Filtra i record errati
                cleaned_doc = clean_record(doc)

                # Aggiungi solo i documenti validi alla lista
                if is_valid_record(cleaned_doc):
                    all_records.append(cleaned_doc)
        else:
            print("❌ Il file JSON non contiene una lista valida.")

        print("✅ File JSON caricato correttamente!")

    except Exception as e:
        print(f"❌ Errore durante la lettura del JSON: {e}")

# ✅ Se abbiamo dati validi, li inseriamo in MongoDB
if all_records:
    try:
        collection.insert_many(all_records)
        print("🚀 Inserimento completato con successo!")
    except Exception as e:
        print(f"❌ Errore durante l'inserimento in MongoDB: {e}")
else:
    print("⚠️ Nessun dato valido disponibile per l'inserimento.")