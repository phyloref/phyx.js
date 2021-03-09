# Example files

This directory contains example Phyx files used by the Phyx.js test suite.
The `correct/` subdirectory contains correctly-formed Phyx files
that should be convertible to OWL ontologies without any errors. Furthermore,
they should all pass validation using the JSON Schema description of the Phyx
format. The `incorrect/` subdirectory contains incorrectly-formed Phyx files that
are intended to ensure that errors are reported correctly by the Phyx.js library
and can be detected by the JSON Schema.

For the purposes of testing, all of these Phyx files use the development version of
the Phyx Context file (located at `/docs/context/development`). This allows the
Phyx Context file to be developed side-by-side with the example files, and -- through
continuous integration testing -- to ensure that the example files always work with
the development version of the Context file. If sharing these example files outside
of this repository, you should use the most recently published version of these
example files with the `@context` replaced by the most recently published version
of the Phyx Context file.

## List of example files
* [./correct/brochu_2003.json]: Some minimum and maximum clade definitions from [Brochu 2003].
  * [./correct/brochu_2003.jsonld]: The OWL ontology representation of these clade definitions in the JSON-LD format.
  * [./correct/brochu_2003.nq]: The OWL ontology representation of these clade definitions in the N-Quads format.
* [./correct/fisher_et_al_2007.json]: Two phyloreferences from [Fisher et al 2007]. Both use specimens as specifiers, while one (*Exodictyon*) also includes a taxonomic circumscription for one of its specifiers.
  * [./correct/fisher_et_al_2007.jsonld]: The OWL ontology representation of these clade definitions in the JSON-LD format.
  * [./correct/fisher_et_al_2007.nq]: The OWL ontology representation of these clade definitions in the N-Quads format.
* [./correct/testudinata_phylonym.json]: An apomorphy-based clade definition from the [*Phylonym* book].
  * [./correct/testudinata_phylonym.jsonld]: The OWL ontology representation of these clade definitions in the JSON-LD format.
  * [./correct/testudinata_phylonym.nq]: The OWL ontology representation of these clade definitions in the N-Quads format.
* [./correct/alligatoridae_default_nomen_code.json]: A Phyx representation of the definition for Alligatoridae from [Brochu 2003] where neither phyloref nor phylogeny have nomenclatural codes; instead, the default nomenclatural code set in the Phyx file should be used.
* [./correct/alligatoridae_inferred_nomen_code.json]: A Phyx representation of the definition for Alligatoridae from [Brochu 2003] that provides nomenclatural codes for phyloref specifiers, requiring Phyx.js to infer that the same nomenclatural code should be used when interpreting the phylogeny.
* [./correct/example_five_external_specifiers.json]: A made-up phyloreference that has five external specifiers.

  [Brochu 2003]: https://doi.org/10.1146/annurev.earth.31.100901.141308
  [Fisher et al 2007]: https://doi.org/10.1639/0007-2745(2007)110[46:POTCWA]2.0.CO;2
  [*Phylonym* book]: https://www.routledge.com/Phylonyms-A-Companion-to-the-PhyloCode/Queiroz-Cantino-Gauthier/p/book/9781138332935
