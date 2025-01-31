const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/scuola', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const SegnalazioneSchema = new mongoose.Schema({
  dove: String,
  rating: Number,
  tipo_di_crimine: String,
  descrizione: String
});

const Segnalazione = mongoose.model('Segnalazione', SegnalazioneSchema);

app.post('/api/segnalazioni', async (req, res) => {
  try {
    const segnalazione = new Segnalazione(req.body);
    await segnalazione.save();
    res.status(201).json({ message: 'Segnalazione salvata!' });
  } catch (error) {
    res.status(500).json({ error: 'Errore nel salvataggio' });
  }
});

app.listen(3000, () => console.log('Server avviato su http://localhost:3000'));
