# Lost & Found Website

COMP3510SEF Group Project

This is a simple web-based Lost & Found system.
Users can create lost or found item posts, search records, view item details, and manage item status.

## Install

Open the project folder in terminal and run:

```bash
npm install
```

## Environment Setup

Create a `.env` file in the project root and add:

```env
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
```

## Run

Start the project with:

```bash
npm start
```

If `npm start` is not available, use:

```bash
node server.js
```

## Open in Browser

```text
http://localhost:8089
```

## Notes

- This project is designed to run locally.
- Uploaded images are stored in `public/uploads`.
