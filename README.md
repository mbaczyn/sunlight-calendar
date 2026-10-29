# Sunlight Calendar — Warszawa vs Dublin

Prosta aplikacja React + TypeScript pokazująca tygodniowe godziny wschodu i zachodu słońca oraz długość dnia w Warszawie i Dublinie.

## Wymagania
- Node.js w wersji obsługiwanej przez aktualną wersję Vite
- npm

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Otwórz adres pokazany przez Vite (zwykle http://localhost:5173).

## Budowanie wersji produkcyjnej

```bash
npm run build
npm run preview
```

Gotowe pliki statyczne znajdą się w katalogu `dist/`.

## Funkcje
- Wybór roku i tygodnia ISO (środa jest reprezentatywnym dniem tygodnia)
- Wschód i zachód słońca dla obu miast
- Przełączanie wykresu między czasem lokalnym i UTC
- Wykres godzin wschodu/zachodu oraz wykres długości dnia
- Tabela wszystkich tygodni z lokalnymi godzinami i UTC
- Eksport danych do CSV

## Obliczenia i ograniczenia
- Współrzędne są przybliżone i reprezentują centra miast.
- Dane oblicza biblioteka SunCalc w przeglądarce, bez serwera i zewnętrznego API.
- Długość dnia to różnica między obliczonym zachodem i wschodem słońca.
- Wyniki są przybliżeniem astronomicznym; widoczny wschód/zachód może zależeć od lokalnego horyzontu, zabudowy i warunków atmosferycznych.
- UTC w tabeli jest podane dla dokładnych momentów zdarzeń. Przełącznik wykresu zmienia tylko sposób prezentacji osi godzinowej; wykres długości dnia pozostaje w godzinach i nie zależy od strefy czasowej.
- Eksport CSV używa średnika jako separatora, co zwykle ułatwia otwarcie pliku w polskim Excelu.

## Publikacja
Projekt można wdrożyć na Vercel, Netlify lub dowolnym hostingu statycznym. Ustaw polecenie budowania `npm run build` i katalog wynikowy `dist`.
