require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Set up Twilio client
const twilioClient = twilio(process.env.ACca0b73c35d98defdd6fc810eb4633c7b, process.env.ae2007f21df53431341ba21e485ab234);

// Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS  // Use the generated App Password here
  }
});

// Endpoint to fetch nearby hospitals and blood banks
app.get('/nearby', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'Latitude and Longitude are required' });

  // Query Overpass API for nearby hospitals and blood banks within a 2 km radius
  const overpassQuery = `
    [out:json];
    (
      node["amenity"="hospital"](around:2000,${lat},${lon});
      node["amenity"="blood_bank"](around:2000,${lat},${lon});
    );
    out center;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: overpassQuery
    });

    const data = await response.json();
    const places = data.elements.map(el => ({
      name: el.tags.name || 'Unnamed',
      address: el.tags['addr:full'] || `${el.tags['addr:street'] || ''} ${el.tags['addr:housenumber'] || ''}`.trim() || 'Address N/A',
      type: el.tags.amenity,
      lat: el.lat, lon: el.lon,
      phone: el.tags.phone || 'N/A',
      email: el.tags.email || ''
    }));

    res.json({ places });
  } catch (err) {
    console.error('Error fetching nearby locations:', err);
    res.status(500).json({ error: 'Failed to fetch nearby locations' });
  }
});

// SOS route to send email and SMS
app.post('/api/sos', async (req, res) => {
  const { name, bloodGroup, lat, lon } = req.body;
  if (!name || !bloodGroup || !lat || !lon) {
    return res.status(400).json({ error: 'Name, blood group, latitude, and longitude are required' });
  }

  try {
    // Fetch nearby hospitals and blood banks
    const nearbyRes = await fetch(`http://localhost:${PORT}/nearby?lat=${lat}&lon=${lon}`);
    const { places } = await nearbyRes.json();

    // Email content with nearby facilities
    const header = `
      <h2>SOS Request from ${name}</h2>
      <p><strong>Blood Group Required:</strong> ${bloodGroup}</p>
      <p><strong>Location:</strong> 
        <a href="https://maps.google.com/?q=${lat},${lon}" target="_blank">
          View on Google Maps
        </a>
      </p>
      <h3>Facilities within 2 km:</h3>
    `;
    
    const list = places.length
      ? `<ul>${places.map(p => 
          `<li><strong>${p.name}</strong> (${p.type})<br/>${p.address}</li>`).join('')}</ul>`
      : '<p>No hospitals or blood banks found within 2 km.</p>';
    
    const html = header + list;

    // Send email alert
    await transporter.sendMail({
      from: 'No-Reply <no-reply@example.com>',
      to: 'soumikghosal108@gmail.com',  // Replace with the email to send the SOS alerts to
      subject: `EMERGENCY SOS from ${name}`,
      html
    });

    // Send SMS alerts
    places.forEach(place => {
      if (place.phone !== 'N/A') {
        twilioClient.messages.create({
          body: `SOS Request: ${name} needs blood type ${bloodGroup}. Location: https://maps.google.com/?q=${lat},${lon}`,
          from: process.env.TWILIO_PHONE_NUMBER,  // Your Twilio phone number
          to: place.phone
        }).then(message => {
          console.log(`Message sent to ${place.phone}: ${message.sid}`);
        }).catch(err => {
          console.error(`Failed to send message to ${place.phone}:`, err);
        });
      }
    });

    res.json({ success: true, found: places.length });
  } catch (err) {
    console.error('Error sending alerts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
