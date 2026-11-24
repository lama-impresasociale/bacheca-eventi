// Firestore include re2js solo per le espressioni regolari delle "pipeline" (non usate qui).
// Lo sostituiamo con un segnaposto per risparmiare circa 150 KB.
export const RE2JS = { compile() { throw new Error('Espressioni regolari Firestore non incluse in questo bundle'); } };
