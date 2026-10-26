# KLR 36 - Moto-Volta Athens 2026

🏍️ **Celebrate 36 years of Kawasaki KLR adventure with the Athens moto community!**

## Event Overview

**KLR 36** is a special celebration of the legendary Kawasaki KLR650, which has been a pillar of adventure riding since 1987. We're organizing a scenic **Moto-Volta** (circular motorcycle ride) around Athens in November 2026, bringing together KLR owners and adventure riders from across Greece.

- **Date**: November 1, 2026
- **Route**: ~200 km scenic loop around Athens
- **Duration**: 08:00 AM - 06:00 PM
- **Location**: Athens, Greece

## Website Features

This is a simple, self-contained event website built with vanilla HTML, CSS, and JavaScript. No backend or server required!

### Features:
- 🎨 Beautiful, responsive event landing page
- 📝 RSVP form with name and motorcycle type
- 🏍️ Live rider list showing confirmed attendees
- 💾 Shared RSVP list stored in a Google Sheet (via Google Apps Script)
- 📱 Mobile-friendly design
- ⚡ Fast and lightweight (pure frontend)

## Project Structure

```
klr36-moto-volta/
├── index.html      # Main event page
├── style.css       # Styling and responsive design
├── script.js       # Form handling and data management
├── README.md       # This file
└── .gitignore      # Git ignore rules
```

## How It Works

1. **RSVP Form**: Visitors fill in their name, motorcycle type, and riding status
2. **Data Storage**: Responses are saved to the organiser's Google Sheet through the Apps Script web app in `apps-script/Code.gs` (setup steps are at the top of that file). Until `RSVP_ENDPOINT` in `script.js` is set, they only stay in the visitor's browser
3. **Live Display**: Confirmed riders are displayed in real-time on the page
4. **No Server to Run**: Google hosts the storage; the site itself stays static

### Data Structure

Each RSVP entry contains:
```json
{
  "name": "Rider Name",
  "motorcycle": "Kawasaki KLR250 1990",
  "attendance": "yes",
  "message": "Can't wait for this!",
  "timestamp": "2026-10-01T12:00:00.000Z"
}
```

## Deployment Options

### Option 1: GitHub Pages (Recommended - Free!)
1. Push this repository to GitHub
2. Go to **Settings → Pages**
3. Select **Deploy from a branch** → main branch
4. Your site will be live at `https://yourusername.github.io/klr36-moto-volta/`

### Option 2: Netlify (Drag & Drop)
1. Go to [netlify.com](https://www.netlify.com)
2. Drag and drop this folder
3. Your site is live instantly!

### Option 3: Vercel
1. Go to [vercel.com](https://www.vercel.com)
2. Import this GitHub repository
3. One-click deployment

### Option 4: Self-Hosted
Simply upload all files to your web server via FTP/SSH:
```bash
scp -r ./klr36-moto-volta/ user@yourserver.com:/var/www/html/
```

## Local Development

To test locally:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have http-server installed)
http-server

# Using Python's built-in server
cd klr36-moto-volta
python -m http.server
```

Then open `http://localhost:8000` in your browser.

## Customization

### Change Event Details
Edit `index.html` and update:
- Event date: `<p>Sunday 1 November</p>`
- Starting point: the Where card links to Θέατρο Βράχων on Google Maps
- Google Maps route: the link on the Route card

### Modify Colors
Edit `style.css` variables:
```css
:root {
    --blue: #1f6fe0;         /* KLR tank blue */
    --green: #5fd13a;        /* Kawasaki green */
    --bg: #07090f;           /* Dark background */
}
```


## Features & Details

### Responsive Design
- ✅ Desktop (1920px+)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (320px - 767px)

### Accessibility
- Semantic HTML
- Proper form labels
- Keyboard navigation support
- Color contrast compliance

### Performance
- **Size**: < 100 KB total (HTML + CSS + JS)
- **Load Time**: < 1 second on 3G
- **No external dependencies**
- **No JavaScript frameworks needed**

## Data Export

All RSVPs, including the private messages, are in the organiser's Google Sheet (tab "RSVPs"). Use File → Download in Google Sheets to export them.

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Important Notes

### Data Persistence
- RSVPs are stored in the organiser's Google Sheet and shared by every visitor
- The rider list refreshes every 30 seconds
- To remove an RSVP, delete its row in the sheet

### Privacy
- RSVPs (name, motorcycle, attendance, message) are sent to the organiser's Google Sheet
- The website only shows names and motorcycles; messages stay in the sheet
- For data analytics, you may want to add Google Analytics

## Future Enhancements

- [ ] Email notifications when riders RSVP
- [ ] Map integration showing route
- [ ] Photo gallery for event day
- [ ] SMS reminders
- [ ] Dark mode toggle
- [ ] Multi-language support

## Contact & Questions

For questions about the event or website:
- 📧 **Email**: [your-email@example.com]
- 📱 **WhatsApp Group**: [Link to group]
- 🏍️ **Hashtags**: #KLR36 #MotoVolta #AthensRiders

## License

This project is open source and available under the MIT License. Feel free to fork, modify, and use it for your own moto events!

## Credits

Built with ❤️ for the adventure riding community.

---

**Keep the rubber side down and see you on the road! 🏍️**

*KLR 36 - Moto-Volta Athens 2026*
