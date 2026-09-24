# ROADMAP

Testa il tracking: metriche, goal, revenue.  
Testa le email.  
Testa ux pagamenti e download fatture.  
Testa report automatici.  
Controlla ci siano tutte le features della piattaforma dentro /documentation.
Studiare e definire pricing.  
Crea landing page per agencies, metti screenshot dentro e live example branded.  
Tracka di default il sito stesso di pulsio, crea uno shared link condiviso (revenue off), e linkalo in home con "View live demo".  
Metti stripe keys live in produzione.  
Testa pagamento in produzione.  

Backups, disaster recovery, runbook se parte ddos.

Trova tutti gli errori o logiche fallaci nel codebase che portano la piattaforma va in errore.   
Non modificare file. Scrivi scoperte e soluzioni in bugs.md

Trova tutti i flussi logici nel codebase che portano la piattaforma a perdere soldi,
o a causare sfiducia o confusione o frustrazione nell'utente finale.    
Non modificare nulla. Scrivi soluzioni proposte in ux.md

L'obiettivo è fare refactor del codebase per diminuire righe scritte, 
e massimizzare semplicità, leggibilità, manutenibilità, e performance della piattaforma.
- leggibilità: per l'umano, inteso come full-stack developer senior competente
- performance: solo se il gain è un moltiplicatore delle performance (latente, velocità query, caricamenti) ovvero x2 o più (no microgain)
- no over-engineering
- soluzioni semplici sempre da preferire a soluzioni complesse, dove le soluzioni semplici sono quelle che un umano
può comprendere con un diagramma, flussi e massimo 500 parole.
Non modificare nulla. Scrivi le soluzioni che proponi in refactor.md

L'obiettivo è implementare le specs e2e dentro packages/nfr/src/ per massimizzare la copertura di:
- ogni feature messa a disposizione dalla piattaforma
- ogni caso d'uso che l'utente può avere con la piattaforma
- ogni interazione che l'utente può avere con la piattaforma
Ogni caso d'uso deve risiedere in un file nominato con uno slug che si comprenda (eg: share-dashboard.tsx, change-billing-details.tsx).  
Non fare assertions su cose marginali.  
Le specs devono poter essere eseguite individualmente con vitest-ui lasciando il browser aperto alla fine dell'esecuzione, con pnpm -F nfr e2e:ui   
Non modificare nulla. Scrivi le specs che proponi di implmentare in e2e.md

## V2

Load testing per endpoint /event.  

Crea ambiente di staging:
- le commit su main vanno su staging.<service name>.xxx.com
- le tag vanno sul dominio <service name>.xxx.com

Custom domains (ma fatto per workspace?)

Managed proxy (Enterprise) by default included  
We handle the proxy for you. You set up a CNAME record pointing to our infrastructure,  
update the snippet on your site, and we take care of everything else. No ongoing maintenance on your end.

Puoi rendere le stats di un sito visibile con un link specifico per un intervallo di tempo, 1h, 24h, forever e revokarlo quando vuoi.
Export data, you're never hostage or locked-in.
View counter badge feature from https://simplytics.dev/