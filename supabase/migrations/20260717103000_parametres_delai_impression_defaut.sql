-- Délai d'impression par défaut, utilisé en secours quand une unité n'a pas
-- de delai_impression_jours renseigné. Jusqu'ici, une unité sans délai ne
-- générait jamais d'alerte d'impression, silencieusement.
alter table parametres
  add column delai_impression_defaut_jours integer not null default 7;
