
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Database setup
const db = new sqlite3.Database('./slides.db');

db.serialize(() => {
  db.run(\`
    CREATE TABLE IF NOT EXISTS slideshows (
      id TEXT PRIMARY KEY,
      name TEXT,
      loop BOOLEAN
    );
  \`);
  db.run(\`
    CREATE TABLE IF NOT EXISTS slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slideshow_id TEXT,
      type TEXT CHECK(type IN ('url', 'image')),
      content TEXT,
      duration INTEGER,
      active BOOLEAN DEFAULT 1,
      "order" INTEGER
    );
  \`);
});

app.get('/slides/:id', (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM slideshows WHERE id = ?", [id], (err, slideshow) => {
    if (err || !slideshow) return res.status(404).send({ error: "Slideshow not found" });
    db.all("SELECT * FROM slides WHERE slideshow_id = ? AND active = 1 ORDER BY "order"", [id], (err, slides) => {
      if (err) return res.status(500).send(err);
      res.send({ ...slideshow, slides });
    });
  });
});

app.post('/slides', (req, res) => {
  const { id, name, loop, slides } = req.body;
  db.run("INSERT INTO slideshows (id, name, loop) VALUES (?, ?, ?)", [id, name, loop ? 1 : 0], function (err) {
    if (err) return res.status(500).send(err);
    const stmt = db.prepare("INSERT INTO slides (slideshow_id, type, content, duration, active, "order") VALUES (?, ?, ?, ?, ?, ?)");
    slides.forEach((slide, index) => {
      stmt.run(id, slide.type, slide.content, slide.duration, 1, index);
    });
    stmt.finalize();
    res.send({ message: "Slideshow created" });
  });
});

app.put('/slides/:id', (req, res) => {
  const id = req.params.id;
  const { name, loop, slides } = req.body;
  db.run("UPDATE slideshows SET name = ?, loop = ? WHERE id = ?", [name, loop ? 1 : 0, id], function (err) {
    if (err) return res.status(500).send(err);
    db.run("DELETE FROM slides WHERE slideshow_id = ?", [id], function () {
      const stmt = db.prepare("INSERT INTO slides (slideshow_id, type, content, duration, active, "order") VALUES (?, ?, ?, ?, ?, ?)");
      slides.forEach((slide, index) => {
        stmt.run(id, slide.type, slide.content, slide.duration, 1, index);
      });
      stmt.finalize();
      res.send({ message: "Slideshow updated" });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:\${PORT}`);
});
