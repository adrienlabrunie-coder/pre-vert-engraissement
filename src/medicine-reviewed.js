// One manually reviewed mapping; deliberately invalidated if the source snapshot changes.
// ANMV RCP revision 18/04/2025, checked 28/10/2026, independently cross-checked with EU UPD.
export function reviewedMedicine(m){
 if(m?.name!=='MULTIBIO SUSPENSION INJECTABLE'||m.amm!=='FR/V/0854561 5/1988'||!['fab4e307edadcb9323901d2c4999a711ebf2e8b131d805938488803f21f70fa4','b239af1ad9e2e5186f6d51e76724b89e19db4c886f2ebf689f683011db49e7ec'].includes(m.sourceHash))return null;
 return {routes:['Voie intramusculaire','Voie sous-cutanée','Voie intrapéritonéale'],meatDays:21,intervalHours:12,count:6,doseReference:'Repère RCP : 1 mL pour 10 kg de poids vif par administration, matin et soir pendant 3 jours. La dose réelle doit suivre l’ordonnance.'};
}
