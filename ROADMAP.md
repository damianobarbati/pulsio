# ROADMAP

Se servono altri chiarimenti chiedi prima di implementare.

---
Reperisci credenziali produzione di stripe e smtp.  
Aggiungi manifest k8s.  
Aggiungi secret a k8s e gh actions.

---
Crea ambiente di staging:
- le commit su main vanno su staging.<service name>.xxx.com
- le tag vanno sul dominio <service name>.xxx.com

## V2

---
Managed proxy (Enterprise) by default included
We handle the proxy for you. You set up a CNAME record pointing to our infrastructure, update the snippet on your site, and we take care of everything else. No ongoing maintenance on your end.
Use this when: you are not on WordPress and want the proxy without managing it yourself, or your infrastructure makes self-setup impractical.
When your proxy forwards requests to Plausible, the real visitor IP must be passed in the X-Forwarded-For header. If this header is missing or contains your server's IP instead of the visitor's, Plausible's bot filter will drop the event silently. The API returns HTTP 202 either way.

---
Multidomain
puoi usare lo stesso snippet di tracking su piu domini.  
appaiono automaticamente tutti i domini che tracci nella select in alto a sx del pannello.
l'utente deve poter:
- selezionare un sito
- selezionare piu siti
selezionare tutti i siti
le metriche vengono aggregate

---
Public stats
Puoi rendere le stats di un sito pubblica, lo toggli e ti viene generato un link che puoi pubblicare. chi entra vede tutto, ma non puo modificare nulla.
puoi abilitare il flag embed che toglie via tutto e rende il contenuto 100vw/100vh chiamabile dentro un iframe

---
Share stats
Puoi rendere le stats di un sito visibile con un link specifico per un intervallo di tempo, 1h, 24h, forever e revokarlo quando vuoi.

---
Export data, you're never hostage or locked-in.

---
View counter badge com in https://simplytics.dev/
Opensource e docker image per usarlo localmente senza limiti.