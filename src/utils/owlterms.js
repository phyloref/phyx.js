
// Some OWL constants to be used.
module.exports = {
  CDAO_HAS_CHILD: 'obo:CDAO_0000149',
  CDAO_HAS_DESCENDANT: 'obo:CDAO_0000174',
  PHYLOREF_EXCLUDES_LINEAGE_TO: 'phyloref:excludes_lineage_to',
  PHYLOREFERENCE_TEST_CASE: 'testcase:PhyloreferenceTestCase',
  PHYLOREFERENCE_PHYLOGENY: 'testcase:PhyloreferenceTestPhylogeny',
  TESTCASE_SPECIFIER: 'testcase:Specifier',
  TU_HAS_NAME_PROP: 'http://rs.tdwg.org/ontology/voc/TaxonConcept#hasName',
  TU_SPECIMEN_PROP: 'dwc:organismID',

  // Terms from CDAO (http://www.obofoundry.org/ontology/cdao.html).
  CDAO_TU: 'http://purl.obolibrary.org/obo/CDAO_0000138',

  // Terms from the TaxonName ontology
  // (https://github.com/tdwg/ontology/blob/master/ontology/voc/TaxonName.rdf).
  TDWG_VOC_TAXON_NAME: 'http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName',
  TDWG_VOC_TAXON_CONCEPT: 'http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept',
  TDWG_VOC_HAS_NAME: 'http://rs.tdwg.org/ontology/voc/TaxonConcept#hasName',
  TDWG_VOC_NAME_COMPLETE: 'http://rs.tdwg.org/ontology/voc/TaxonName#nameComplete',

  // Terms from Darwin Core.
  DWC_OCCURRENCE: 'http://rs.tdwg.org/dwc/terms/Occurrence',

  // Nomenclatural codes from Nomen.
  NAME_IN_UNKNOWN_CODE: 'http://purl.obolibrary.org/obo/NOMEN_0000036', // NOMEN:scientific name
  ICZN_NAME: 'http://purl.obolibrary.org/obo/NOMEN_0000107',
  ICN_NAME: 'http://purl.obolibrary.org/obo/NOMEN_0000109',
  ICNP_NAME: 'http://purl.obolibrary.org/obo/NOMEN_0000110',
  ICTV_NAME: 'http://purl.obolibrary.org/obo/NOMEN_0000111',
};
