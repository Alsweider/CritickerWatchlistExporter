// ==UserScript==
// @name         Criticker Watchlist Exporter
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @description  Exports the entries of a Criticker watchlist as a CSV file.
// @author       Alsweider
// @match        https://www.criticker.com/films/?collection=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=criticker.com
// @grant        GM_download
// @license MIT
// @downloadURL https://update.greasyfork.org/scripts/521339/Criticker%20Watchlist%20Exporter.user.js
// @updateURL https://update.greasyfork.org/scripts/521339/Criticker%20Watchlist%20Exporter.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // Variablen
    let collectionId = new URLSearchParams(window.location.search).get("collection");
    let allEntries = [];
    let totalPages = 1; // Wird später dynamisch gesetzt

    // Funktion zum Extrahieren der Einträge aus der HTML-Seite
    function extractEntriesFromDocument(doc) {
        let entries = [];
        doc.querySelectorAll(".fl_name").forEach(div => {
            let titleElement = div.querySelector(".fl_titlelist_link");
            let scoreElement = div.parentElement.querySelector(".pti");
            if (titleElement) {
                let fullText = titleElement.innerText.trim();
                let match = fullText.match(/^(.*) \((\d{4})\)$/); // Extrahiert Titel und Jahr
                if (match) {
                    let title = match[1];
                    let year = match[2];
                    let score = scoreElement ? scoreElement.innerText.trim() : ""; // Probable Score extrahieren
                    entries.push({ title, year, score });
                }
            }
        });
        return entries;
    }

    // Funktion zum Abrufen der Inhalte einer Seite
    function fetchPage(pageNumber) {
        return new Promise((resolve, reject) => {
            let pageUrl = `https://www.criticker.com/films/?collection=${collectionId}&p=${pageNumber}`;
            console.log(`Lade Seite ${pageNumber}: ${pageUrl}`);

            fetch(pageUrl)
                .then(response => response.text())
                .then(html => {
                    let parser = new DOMParser();
                    let doc = parser.parseFromString(html, "text/html");

                    // Einträge extrahieren
                    let entries = extractEntriesFromDocument(doc);
                    resolve(entries);

                    // Gesamtseitenzahl prüfen (falls noch nicht gesetzt)
                    if (pageNumber === 1) {
                        let paginationLinks = doc.querySelectorAll(".pagination a");
                        if (paginationLinks.length > 0) {
                            totalPages = Math.max(...Array.from(paginationLinks).map(link => {
                                let match = link.href.match(/&p=(\d+)/);
                                return match ? parseInt(match[1]) : 1;
                            }));
                            console.log(`Gesamtseiten: ${totalPages}`);
                        }
                    }
                })
                .catch(error => {
                    console.error(`Fehler beim Abrufen von Seite ${pageNumber}:`, error);
                    reject(error);
                });
        });
    }

    // Funktion zum Verarbeiten aller Seiten
    async function fetchAllPages() {
        for (let i = 1; i <= totalPages; i++) {
            let entries = await fetchPage(i);
            allEntries = allEntries.concat(entries);
        }
        createCSV(allEntries);
    }

    // Funktion zum Erstellen der CSV-Datei
    function createCSV(entries) {
        let csvContent = "Title,Year,Probable Score\n";
        entries.forEach(entry => {
            csvContent += `"${entry.title}","${entry.year}","${entry.score}"\n`;
        });

        // CSV-Datei zum Download bereitstellen
        let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        let url = URL.createObjectURL(blob);
        let a = document.createElement("a");
        a.href = url;
        a.download = "criticker_watchlist.csv";
        a.click();
        URL.revokeObjectURL(url);
        console.log("CSV erfolgreich erstellt!");
    }

    // Starten der Extraktion
    window.addEventListener("load", () => {
        console.log("Starte die Extraktion aller Seiten...");
        fetchAllPages().then(() => {
            console.log("Extraktion abgeschlossen!");
        });
    });
})();
