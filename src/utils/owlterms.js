
// Some OWL constants to be used.
module.exports = {
  // Where is our context file located?
  PHYX_CONTEXT_JSON: 'http://www.phyloref.org/phyx.js/context/v0.2.0/phyx.json',

  // OWL properties.
  OWL_CLASS: 'owl:Class',
  OWL_RESTRICTION: 'owl:Restriction',

  // Phyloref properties.
  PHYLOREF_INCLUDES_TU: 'phyloref:includes_TU',
  PHYLOREF_EXCLUDES_TU: 'phyloref:excludes_TU',

  // Terms from RDF
  RDF_TYPE: 'rdf:type',

  // Terms from CDAO (http://www.obofoundry.org/ontology/cdao.html).
  CDAO_TU: 'obo:CDAO_0000138',
  CDAO_NODE: 'obo:CDAO_0000140',
  CDAO_REPRESENTS_TU: 'obo:CDAO_0000187',
  CDAO_HAS_CHILD: 'obo:CDAO_0000149',
  CDAO_HAS_DESCENDANT: 'obo:CDAO_0000174',
  CDAO_ROOTED_TREE: 'obo:CDAO_0000012',
  CDAO_HAS_ROOT: 'obo:CDAO_0000148',
  CDAO_HAS_ELEMENT: 'obo:CDAO_0000198',

  // Terms from the TaxonName ontology
  // (https://github.com/tdwg/ontology/blob/master/ontology/voc/TaxonName.rdf).
  TDWG_VOC_TAXON_NAME: 'http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName',
  TDWG_VOC_TAXON_CONCEPT: 'http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept',
  TDWG_VOC_HAS_NAME: 'http://rs.tdwg.org/ontology/voc/TaxonConcept#hasName',
  TDWG_VOC_NAME_COMPLETE: 'http://rs.tdwg.org/ontology/voc/TaxonName#nameComplete',

  // Terms from Darwin Core.
  DWC_OCCURRENCE: 'http://rs.tdwg.org/dwc/terms/Occurrence',
  DWC_OCCURRENCE_ID: 'http://rs.tdwg.org/dwc/terms/occurrenceID',

  // Nomenclatural codes from Nomen.
  NOMENCLATURAL_CODE: 'http://rs.tdwg.org/ontology/voc/TaxonName#nomenclaturalCode',
  UNKNOWN_CODE: undefined,
  ICZN_CODE: 'http://rs.tdwg.org/ontology/voc/TaxonName#ICZN',
  ICN_CODE: 'http://rs.tdwg.org/ontology/voc/TaxonName#ICBN',
  ICNP_CODE: 'http://ontology.phyloref.org/tcan.owl#ICNP',
  ICTV_CODE: 'http://ontology.phyloref.org/tcan.owl#ICTV',
  ICNCP_CODE: 'http://rs.tdwg.org/ontology/voc/TaxonName#ICNCP',

  // Terms from the Ontology for Biomedical Investigations.
  OBI_HAS_SPECIFIED_INPUT: 'obo:OBI_0000293',
  OBI_IS_SPECIFIED_OUTPUT_OF: 'obo:OBI_0000312',
  OBI_PREDICTION: 'obo:OBI_0302910',
};
