// Display names only: raw provider names remain unchanged for scores and favourites.
const key=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('el').replace(/[^\p{L}\p{N}]/gu,'');
const names=[
 ['ΠΑΝΕΡΥΘΡΑΙΚΟΣ ΑΣ','Πανερυθραϊκός ΑΣ'],['ΓΣ ΣΟΦΑΔΩΝ ΒΙΚΟΣ COLA','ΓΣ Σοφάδων Βίκος Cola'],
 ['ΠΑΝΙΩΝΙΟΣ COSMORAMA TRAVEL','Πανιώνιος Cosmorama Travel'],['ΠΑΝΙΩΝΙΟΣ','Πανιώνιος'],['Πανιώνιος Betsson','Πανιώνιος Betsson'],
 ['ΓΣ ΛΑΥΡΙΟΥ - AΦΟΙ ΛΙΟΣΑΤΟΥ','ΓΣ Λαυρίου - Αφοί Λιοσάτου'],['ΜΕΓΑΡΑ ΟΝΕΧ BC','Μέγαρα ΟΝΕΧ BC'],['ΑΕΟ ΠΡΩΤΕΑΣ ΒΟΥΛΑΣ','ΑΕΟ Πρωτέας Βούλας'],['KERAKOLL ΑΓΕΧ','Kerakoll ΑΓΕΧ'],
 ['INTERPLAST ΓΑΣ ΚΟΜΟΤΗΝΗΣ','Interplast ΓΑΣ Κομοτηνής'],['ΑΕ ΨΥΧΙΚΟΥ','ΑΕ Ψυχικού'],['ΑΣΑ ΚΟΡΟΙΒΟΣ','ΑΣΑ Κόροιβος'],['ΑΕΠΣ ΜΑΧΗΤΕΣ ΠΕΙΡΑΜΑΤΙΚΟ','ΑΕΠΣ Μαχητές Πειραματικό'],['ΑΟ ΑΜΥΝΤΑΣ','ΑΟ Αμύντας'],['KRONOS BC PLASIS','Kronos BC Plasis'],['Α.Ε. ΓΛΑΥΚΟΥ ΕΣΠΕΡΟΥ','ΑΕ Γλαύκου Εσπέρου'],['ΑΣΑ ΑΝΑΓΕΝΝΗΣΗ','ΑΣΑ Αναγέννηση'],['EVERTECH ΠΑΠΑΓΟΥ','Evertech Παπάγου'],
 ['ΚΑΡΔΙΤΣΑ ΙΑΠΩΝΙΚΗ','Καρδίτσα Ιαπωνική'],['ΠΕΡΙΣΤΕΡΙ Betsson','Περιστέρι Betsson'],['ΟΛΥΜΠΙΑΚΟΣ','Ολυμπιακός'],['ΠΑΝΑΘΗΝΑΪΚΟΣ AKTOR','Παναθηναϊκός Aktor'],['ΗΡΑΚΛΗΣ','Ηρακλής'],['ΑΡΗΣ','Άρης'],['ΚΟΛΟΣΣΟΣ H HOTELS COLLECTION','Κολοσσός H Hotels Collection'],['ΠΡΟΜΗΘΕΑΣ ΠΑΤΡΑΣ ΒΙΚΟΣ COLA','Προμηθέας Πάτρας Βίκος Cola'],['ΜΥΚΟΝΟΣ Betsson BC','Μύκονος Betsson BC'],['ΔΟΞΑ ΛΕΥΚΑΔΑΣ ELABET','Δόξα Λευκάδας Elabet'],['ΜΑΡΟΥΣΙ','Μαρούσι'],['VIKOS ΦALCONS','Vikos Falcons'],
 ['ΜΑΡΚΟ','Μαρκό'],['ATHENS KALLITHEA','Athens Kallithea'],['ΑΕΛ NOVIBET','ΑΕΛ Novibet'],['ΕΛΛΑΣ ΣΥΡΟΥ','Ελλάς Σύρου'],['ΠΑΝΘΡΑΚΙΚΟΣ','Πανθρακικός'],["ASTERAS AKTOR Β'","Αστέρας Aktor Β'"],['ΑΠΟΛΛΩΝ ΚΑΛΑΜΑΡΙΑΣ','Απόλλων Καλαμαριάς'],['ΝΙΚΗ ΒΟΛΟΥ','Νίκη Βόλου'],['ΑΝΑΓ. ΚΑΡΔΙΤΣΑΣ','Αναγ. Καρδίτσας'],['ΠΑΝΣΕΡΡΑΪΚΟΣ','Πανσερραϊκός'],["ΟΛΥΜΠΙΑΚΟΣ Β'","Ολυμπιακός Β'"],['ΝΕΣΤΟΣ ΧΡΥΣΟΥΠΟΛΗΣ','Νέστος Χρυσούπολης'],['ΠΥΡΓΟΣ','Πύργος'],['ΖΑΚΥΝΘΟΣ','Ζάκυνθος']
];
const known=new Map(names.map(([raw,label])=>[key(raw),label]));
const acronyms=new Set(['ΠΑΟΚ','ΑΕΚ','ΟΦΗ','ΑΕΛ','ΑΟ','ΑΕ','ΑΣ','ΓΣ','ΓΑΣ','ΑΕΟ','ΑΣΑ','ΑΕΠΣ','ΑΓΕΧ','ΠΑΣ','BC','FC','AC','AS','SK','SSC','US','UD','CF','RC','SC','FK','KV','LASK','PSG','NBA']);
export function displayTeamName(value){
 const name=String(value??'').trim();if(known.has(key(name)))return known.get(key(name));
 return name.split(/(\s+)/).map(word=>{
  const letters=word.replace(/[^\p{L}]/gu,'');if(!letters||word!==word.toLocaleUpperCase('el'))return word;
  if(acronyms.has(letters)||letters.length<=2)return word;
  const lower=word.toLocaleLowerCase('el');return lower.replace(/\p{L}/u,c=>c.toLocaleUpperCase('el'));
 }).join('');
}
