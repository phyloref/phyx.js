# phyx.js

[![Build Status](https://github.com/phyloref/phyx.js/workflows/Build%20and%20Test/badge.svg)](https://github.com/phyloref/phyx.js/actions?query=workflow%3A%22Build+and+Test%22)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.5576556.svg)](https://doi.org/10.5281/zenodo.5576556)

The Phyloreference Exchange (PHYX) format is a JSON representation that can be
used to store and transfer definitions of [phyloreferences]. This library provides
classes to help interpret some parts of these files, and for transforming an
entire Phyx file into a [JSON-LD] representation that can be reasoned over with
an [OWL 2 DL] reasoner. See the [Phyloreference Curation Tool] or the [Clade Ontology]
for examples of its usage.

[Tutorials demonstrating the use of phyx.js](./tutorials/) are available.

## Citation

phyx.js should be cited by citing our publication documenting the Phyx format and phyx.js.

> Vaidya G, Cellinese N, Lapp H. 2022. A new phylogenetic data standard for computable clade definitions: the
> Phyloreference Exchange Format (Phyx) PeerJ 10:e12618 [doi:10.7717/peerj.12618](https://doi.org/10.7717/peerj.12618)

## Funding
Funded by the US National Science Foundation through collaborative grants [DBI-1458484]
and [DBI-1458604]. See [Funding] for details.

  [phyloreferences]: http://phyloref.org
  [JSON-LD]: https://en.wikipedia.org/wiki/JSON-LD
  [OWL 2 DL]: https://www.w3.org/TR/owl2-overview/
  [Phyloreference Curation Tool]: https://github.com/phyloref/curation-tool
  [Clade Ontology]: https://github.com/phyloref/clade-ontology
  [DBI-1458484]: http://www.nsf.gov/awardsearch/showAward?AWD_ID=1458484
  [DBI-1458604]: http://www.nsf.gov/awardsearch/showAward?AWD_ID=1458604
  [Funding]: http://www.phyloref.org/about/#funding
