Nella webapp, nel menu a sinistra ci devono essere le sezioni:
- overview: dashboard attuale
- website: view per gestire i siti tracciati
  - crea link condivisibili
  - impostare la valuta del sito
  - creare link condivisibili per il sito
  - reset dei dati relativi al sito
  - reporting: impostare i report automatici per ogni sito (elenco destinatari)
- billing: per cambiare piano, cambiare i dati di fatturazione (salvati su pulsio, e inviati a stripe per essere usati nella prossima invoice), vedere la lista dei pagamenti e scaricare
per ogni pagamento la relativa fattura (se stripe lo consente, se no link alla fattura stripe)
- settings: reset dei dati relativi a tutti i siti, cancella account
- account: cambia email / password
- logout

Reset totale cancella i dati di tutti siti (è come il reset del singolo sito ma per tutit i siti).
Cancellazione account cancella tutto e cancella abbonamento stripe, conserva però lo storico dei pagamenti effettuati dall'utente.

Implementa le funzionalità se mancano.

in kpi-container dentro dashboard.tsx
- rinomina "Unique visitors" in Users (tooltip Unique visitors in 24h)
- rinomina "Total pageviews" in Views
- rinomina "Total visit" in Sessions (tooltip spiega che Session is A continuous period of user interactions on the application for the same User (daily). A session starts on the first view and ends when no heartbeats or events are received for more than 30 minutes, or when the 00:00 UTC rollover occurs)
- rinomina "Views per visit" in Views per session
- rinomina Time on page in Time spent

controlla tutti i form e gli input: non deve essere passato onchange, si devono usare watch per triggerare cambi basati sugli input.
nelle datatable il componente search deve avere il formcontext dentro, non wrappare tutta la tabella