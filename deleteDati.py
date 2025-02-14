from pymongo import MongoClient

uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
client = MongoClient(uri)
db = client["mappaUtenti"]
collection = db["Crimini"]  

# Eliminazione di documenti che soddisfano una condizione (ad esempio, "tipologia" = "Assalto")
result = collection.delete_many({"citta": "Chicago"})

# Numero di documenti eliminati
print(f"Documenti eliminati: {result.deleted_count}")
