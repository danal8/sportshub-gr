// Bundled flags keep current national fixtures available offline.
const localFlags = {
  "gr": "./badges/flags/gr.png",
  "es": "./badges/flags/es.png",
  "ge": "./badges/flags/ge.png",
  "ro": "./badges/flags/ro.png",
  "pt": "./badges/flags/pt.png",
  "pl": "./badges/flags/pl.png",
  "cy": "./badges/flags/cy.png",
  "ua": "./badges/flags/ua.png",
  "rs": "./badges/flags/rs.png",
  "de": "./badges/flags/de.png",
  "nl": "./badges/flags/nl.png"
};
const normalize = name => String(name).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
let regions;
export function nationalFlag(name, competition) {
  if (!['greece-football','greece-basket','nations','friendly'].includes(competition)) return null;
  if (!regions) {
    regions = new Map(Object.entries({england:'gb-eng',scotland:'gb-sct',wales:'gb-wls','northern ireland':'gb-nir','netherlands':'nl','turkey':'tr','czech republic':'cz','ολλανδια':'nl'}));
    for (const locale of ['el','en']) {
      const names = new Intl.DisplayNames(locale,{type:'region',fallback:'none'});
      for (let a=65;a<=90;a++) for (let b=65;b<=90;b++) {
        const code=String.fromCharCode(a,b);
        const label=names.of(code);
        if(label) regions.set(normalize(label),code.toLowerCase());
      }
    }
  }
  const code=regions.get(normalize(name));
  return code ? localFlags[code] || 'https://flagcdn.com/w80/'+code+'.png' : null;
}
