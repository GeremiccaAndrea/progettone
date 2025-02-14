import pandas as pd
from pymongo import MongoClient
from fuzzywuzzy import process
from bson import ObjectId



# 1️⃣ Connettersi a MongoDB
MONGO_URI = "mongodb+srv://Goyco2:Goycochea.2@cluster0.fivcp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "sample_mflix"
COLLECTION_NAME = "comments"


client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]


# 📌 Percorso del file CSV
csv_file = "/workspace/progettone/dati_prova.csv"  # Assicurati che il percorso sia corretto

# ✅ Controlla se il file esiste e leggilo
try:
    df = pd.read_csv(csv_file)
    print("✅ File CSV caricato correttamente!")
except FileNotFoundError:
    print("❌ Errore: Il file CSV non è stato trovato.")
    exit()  # Ferma l'esecuzione se il file non esiste

# 🔄 Mapping automatico delle colonne
column_mapping = {
    "codice": "_id",  # Generiamo un ID unico
    "nome_completo": "name",
    "posta_elettronica": "email",
    "film_codice": "movie_id",
    "recensione": "text",
    "data_recensione": "date"
}

# ✅ Rinomina le colonne in base al mapping
df.rename(columns=column_mapping, inplace=True)

# ✅ Generare `_id` unici se non già presenti
df["_id"] = [ObjectId() for _ in range(len(df))]

# ✅ Convertire il DataFrame in una lista di dizionari
records = df.to_dict(orient="records")

# ✅ Inserire i documenti in MongoDB
collection.insert_many(records)

print("🚀 Inserimento completato con successo!")
for doc in collection.find():
    print(doc)