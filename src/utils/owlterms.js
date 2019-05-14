
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

  /** The default @type for taxonomic units. */
  DEFAULT_TYPES_FOR_TU: [
    'http://purl.obolibrary.org/obo/CDAO_0000138', // CDAO:TU
  ],
};
