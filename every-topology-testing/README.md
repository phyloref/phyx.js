# Every topology testing

As part of testing the process of converting Phyx files into
executable OWL ontologies by Phyx.js, we undertook to test
every possible tree topology with the following number of nodes
(from [Felsenstein 1978]).

| Number of labeled nodes | Number of possible bifurcating trees | Number of all trees |
| --- | ------ | ------ |
|  2  |      1 |      1 |
|  3  |      3 |      4 |
|  4  |     15 |     26 |
|  5  |    105 |    236 |
|  6  |    945 |   2752 |

This testing was carried out in a four step process:
  1. I used the `generate-topologies.js` script to generate every possible topology for the number of nodes listed above. This script carried out several tasks:
    1. Each job would generate one NEXUS file containing all the phylogenies (e.g. for n=4, this would contain 26 phylogenies). The leaf nodes would be labeled with single charactes from the Latin alphabet: A, B, C, D, and so on.
    2. Alongside this NEXUS file, the script would also generate a single Phyx file for each topology. Each Phyx file contained the definition of two phyloreferences: one minimum-clade definition that consisted of the most recent common ancestor of A and B and all of its descendants, and one maximum-clade definition that consisted of the largest clade containing A but not C.
  2. [JPhyloRef] was then used to test the generated Phyx files. We confirmed that every phyloreference resolved as expected.
  3. To ensure that the trees had been generated correctly, we loaded the NEXUS files for each run using the R Notebook in the `validate-trees` directory. This notebook carries out three checks:
    1. It ensures that there are no duplicates among generated topologies.
    2. It attempts to construct lists of the correct topologies, and compares them to the generated topologies to see if there are any differences.

  [Felsenstein 1978]: https://doi.org/10.2307/2412810
  [JPhyloRef]: https://github.com/phyloref/jphyloref
