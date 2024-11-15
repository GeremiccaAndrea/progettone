L'architettura della mappa dati è costituita da due dataset da cui vengono presi i dati (quartieri e crimini) di Chicago.
Per prendere i dati da questi dataset viene utilizzata un'API python che è sempre hostata su internet in modo che i dati siano sempre reperibili. 
L'API è richiamata attraverso una chiamata HTTP da angular, cioè il framework che utilizziamo per il front-end. 
In questa architettura non è presente un Database vero e proprio proprio perché i dati sono salvati nei dataset. 