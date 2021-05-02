# Introduction to phyx.js

This tutorial provides an introduction to the phyx.js library, and shows you how it can be used to interpret [phyloreferences](https://www.phyloref.org/) in Phyx files and convert them into OWL for reasoning.

## Navigating a Phyx document as a JSON file

Every Phyx document is a JSON document. You can read it as a JSON file, validate it against a JSON schema, count the number of phyloreferences and phylogenies, and find the clade definitions of each phyloreference.

The following examples use the [Brochu 2003 example Phyx file](https://github.com/phyloref/phyx.js/blob/master/test/examples/correct/brochu_2003.json) to demonstrate this.


```javascript
// Note that we use `var` instead of `let` in this file. This is because identifiers 
// declared using `let` cannot be re-declared, which makes it impossible to re-run
// code blocks in Jupyter Notebook.
var fs = require('fs');

// Start by reading in `brochu_2003.json`, a Phyx file, as a JSON file.
var brochu2003 = JSON.parse(fs.readFileSync('../test/examples/correct/brochu_2003.json'));
console.log(JSON.stringify(brochu2003, null, 2))
```

    {
      "@context": "../../../docs/context/development/phyx.json",
      "doi": "10.5281/zenodo.4562685",
      "source": {
        "authors": [
          {
            "firstname": "Gaurav",
            "lastname": "Vaidya"
          }
        ],
        "year": 2021,
        "title": "Digital representation of some of the clade definitions in Brochu 2003 in the Phyloreference Exchange (Phyx) format",
        "journal": {
          "name": "Zenodo"
        },
        "identifier": [
          {
            "type": "doi",
            "id": "10.5281/zenodo.4562685"
          }
        ]
      },
      "phylogenies": [
        {
          "newick": "(Parasuchia,(rauisuchians,Aetosauria,(sphenosuchians,(protosuchians,(mesosuchians,(Hylaeochampsa,Aegyptosuchus,Stomatosuchus,(Allodaposuchus,('Gavialis gangeticus',(('Diplocynodon ratelii',('Alligator mississippiensis','Caiman crocodilus')Alligatoridae)Alligatoroidea,('Tomistoma schlegelii',('Osteolaemus tetraspis','Crocodylus niloticus')Crocodylinae)Crocodylidae)Brevirostres)Crocodylia))Eusuchia)Mesoeucrocodylia)Crocodyliformes)Crocodylomorpha))root;",
          "label": "Fig 1 from Brochu 2003",
          "@id": "#phylogeny0",
          "source": {
            "type": "article",
            "title": "Phylogenetic approaches toward crocodylian history",
            "authors": [
              {
                "name": "Christopher A. Brochu",
                "alternate": [
                  "Brochu, Christopher A."
                ],
                "firstname": "Christopher",
                "middlename": "A.",
                "lastname": "Brochu"
              }
            ],
            "year": 2003,
            "figure": "1",
            "identifier": [
              {
                "type": "doi",
                "id": "10.1146/annurev.earth.31.100901.141308"
              }
            ],
            "link": [
              {
                "url": "https://www.annualreviews.org/doi/10.1146/annurev.earth.31.100901.141308"
              }
            ],
            "journal": {
              "name": "Annual Review of Earth and Planetary Sciences",
              "volume": "31",
              "pages": "357--397",
              "identifier": [
                {
                  "type": "eISSN",
                  "id": "1545-4495"
                }
              ]
            }
          }
        }
      ],
      "phylorefs": [
        {
          "label": "Alligatoridae",
          "scientificNameAuthorship": {
            "bibliographicCitation": "(Cuvier 1807)"
          },
          "phylorefType": "phyloref:PhyloreferenceUsingMinimumClade",
          "definition": "Alligatoridae (Cuvier 1807).\n\nLast common ancestor of Alligator mississippiensis and Caiman crocodilus and all of its descendents.",
          "definitionSource": {
            "type": "article",
            "title": "Phylogenetic approaches toward crocodylian history",
            "authors": [
              {
                "name": "Christopher A. Brochu",
                "alternate": [
                  "Brochu, Christopher A."
                ],
                "firstname": "Christopher",
                "middlename": "A.",
                "lastname": "Brochu"
              }
            ],
            "year": 2003,
            "figure": "1",
            "identifier": [
              {
                "type": "doi",
                "id": "10.1146/annurev.earth.31.100901.141308"
              }
            ],
            "link": [
              {
                "url": "https://www.annualreviews.org/doi/10.1146/annurev.earth.31.100901.141308"
              }
            ],
            "journal": {
              "name": "Annual Review of Earth and Planetary Sciences",
              "volume": "31",
              "pages": "357--397",
              "identifier": [
                {
                  "type": "eISSN",
                  "id": "1545-4495"
                }
              ]
            }
          },
          "internalSpecifiers": [
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Caiman crocodilus",
                "nameComplete": "Caiman crocodilus",
                "genusPart": "Caiman",
                "specificEpithet": "crocodilus"
              }
            },
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Alligator mississippiensis",
                "nameComplete": "Alligator mississippiensis",
                "genusPart": "Alligator",
                "specificEpithet": "mississippiensis"
              },
              "label": "Alligator mississippiensis"
            }
          ],
          "externalSpecifiers": []
        },
        {
          "label": "Alligatorinae",
          "scientificNameAuthorship": {
            "bibliographicCitation": "(Kälin 1940)"
          },
          "phylorefType": "phyloref:PhyloreferenceUsingMaximumClade",
          "definition": "Alligatorinae (Kälin 1940).\n\nAlligator mississippiensis and all crocodylians closer to it than to Caiman crocodilus.",
          "definitionSource": {
            "type": "article",
            "title": "Phylogenetic approaches toward crocodylian history",
            "authors": [
              {
                "name": "Christopher A. Brochu",
                "alternate": [
                  "Brochu, Christopher A."
                ],
                "firstname": "Christopher",
                "middlename": "A.",
                "lastname": "Brochu"
              }
            ],
            "year": 2003,
            "figure": "1",
            "identifier": [
              {
                "type": "doi",
                "id": "10.1146/annurev.earth.31.100901.141308"
              }
            ],
            "link": [
              {
                "url": "https://www.annualreviews.org/doi/10.1146/annurev.earth.31.100901.141308"
              }
            ],
            "journal": {
              "name": "Annual Review of Earth and Planetary Sciences",
              "volume": "31",
              "pages": "357--397",
              "identifier": [
                {
                  "type": "eISSN",
                  "id": "1545-4495"
                }
              ]
            }
          },
          "internalSpecifiers": [
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Alligator mississippiensis",
                "nameComplete": "Alligator mississippiensis",
                "genusPart": "Alligator",
                "specificEpithet": "mississippiensis"
              }
            }
          ],
          "externalSpecifiers": [
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Caiman crocodilus",
                "nameComplete": "Caiman crocodilus",
                "genusPart": "Caiman",
                "specificEpithet": "crocodilus"
              },
              "label": "Caiman crocodilus"
            }
          ],
          "expectedResolution": {
            "#phylogeny0": {
              "nodeLabel": "Alligator mississippiensis"
            }
          }
        },
        {
          "label": "Caimaninae",
          "scientificNameAuthorship": {
            "bibliographicCitation": "(Norell 1988)"
          },
          "phylorefType": "phyloref:PhyloreferenceUsingMaximumClade",
          "definition": "Caimaninae (Norell 1988).\n\nCaiman crocodilus and all crocodylians closer to it than to Alligator mississippiensis.",
          "definitionSource": {
            "type": "article",
            "title": "Phylogenetic approaches toward crocodylian history",
            "authors": [
              {
                "name": "Christopher A. Brochu",
                "alternate": [
                  "Brochu, Christopher A."
                ],
                "firstname": "Christopher",
                "middlename": "A.",
                "lastname": "Brochu"
              }
            ],
            "year": 2003,
            "figure": "1",
            "identifier": [
              {
                "type": "doi",
                "id": "10.1146/annurev.earth.31.100901.141308"
              }
            ],
            "link": [
              {
                "url": "https://www.annualreviews.org/doi/10.1146/annurev.earth.31.100901.141308"
              }
            ],
            "journal": {
              "name": "Annual Review of Earth and Planetary Sciences",
              "volume": "31",
              "pages": "357--397",
              "identifier": [
                {
                  "type": "eISSN",
                  "id": "1545-4495"
                }
              ]
            }
          },
          "internalSpecifiers": [
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Caiman crocodilus",
                "nameComplete": "Caiman crocodilus",
                "genusPart": "Caiman",
                "specificEpithet": "crocodilus"
              }
            }
          ],
          "externalSpecifiers": [
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Alligator mississippiensis",
                "nameComplete": "Alligator mississippiensis",
                "genusPart": "Alligator",
                "specificEpithet": "mississippiensis"
              }
            }
          ],
          "expectedResolution": {
            "#phylogeny0": {
              "nodeLabel": "Caiman crocodilus"
            }
          }
        },
        {
          "label": "Crocodyloidea",
          "scientificNameAuthorship": {
            "bibliographicCitation": "(Fitzinger 1826)"
          },
          "phylorefType": "phyloref:PhyloreferenceUsingMaximumClade",
          "definition": "Crocodyloidea (Fitzinger 1826).\n\nCrocodylus niloticus and all crocodylians closer to it than to Alligator mississippiensis or Gavialis gangeticus.",
          "internalSpecifiers": [
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Crocodylus niloticus",
                "nameComplete": "Crocodylus niloticus",
                "genusPart": "Crocodylus",
                "specificEpithet": "niloticus"
              }
            }
          ],
          "externalSpecifiers": [
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Alligator mississippiensis",
                "nameComplete": "Alligator mississippiensis",
                "genusPart": "Alligator",
                "specificEpithet": "mississippiensis"
              },
              "label": "Alligator mississippiensis"
            },
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Gavialis gangeticus",
                "nameComplete": "Gavialis gangeticus",
                "genusPart": "Gavialis",
                "specificEpithet": "gangeticus"
              },
              "label": "Gavialis gangeticus"
            }
          ],
          "expectedResolution": {
            "#phylogeny0": {
              "nodeLabel": "Crocodylidae"
            }
          }
        },
        {
          "label": "Crocodylidae",
          "scientificNameAuthorship": {
            "bibliographicCitation": "(Cuvier 1807)"
          },
          "phylorefType": "phyloref:PhyloreferenceUsingMinimumClade",
          "definition": "Crocodylidae (Cuvier 1807). Definition dependent on phylogenetic context.\n\nLast common ancestor of Crocodylus niloticus, Osteolaemus tetraspis, and Tomistoma schlegelii and all of its descendents.",
          "definitionSource": {
            "type": "article",
            "title": "Phylogenetic approaches toward crocodylian history",
            "authors": [
              {
                "name": "Christopher A. Brochu",
                "alternate": [
                  "Brochu, Christopher A."
                ],
                "firstname": "Christopher",
                "middlename": "A.",
                "lastname": "Brochu"
              }
            ],
            "year": 2003,
            "figure": "1",
            "identifier": [
              {
                "type": "doi",
                "id": "10.1146/annurev.earth.31.100901.141308"
              }
            ],
            "link": [
              {
                "url": "https://www.annualreviews.org/doi/10.1146/annurev.earth.31.100901.141308"
              }
            ],
            "journal": {
              "name": "Annual Review of Earth and Planetary Sciences",
              "volume": "31",
              "pages": "357--397",
              "identifier": [
                {
                  "type": "eISSN",
                  "id": "1545-4495"
                }
              ]
            }
          },
          "internalSpecifiers": [
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Tomistoma schlegelii",
                "nameComplete": "Tomistoma schlegelii",
                "genusPart": "Tomistoma",
                "specificEpithet": "schlegelii"
              }
            },
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Osteolaemus tetraspis",
                "nameComplete": "Osteolaemus tetraspis",
                "genusPart": "Osteolaemus",
                "specificEpithet": "tetraspis"
              },
              "label": "Osteolaemus tetraspis"
            },
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Crocodylus niloticus",
                "nameComplete": "Crocodylus niloticus",
                "genusPart": "Crocodylus",
                "specificEpithet": "niloticus"
              },
              "label": "Crocodylus niloticus"
            }
          ],
          "externalSpecifiers": []
        },
        {
          "label": "Diplocynodontinae",
          "scientificNameAuthorship": {
            "bibliographicCitation": "(Brochu 1999)"
          },
          "phylorefType": "phyloref:PhyloreferenceUsingMaximumClade",
          "definition": "Diplocynodontinae (Brochu 1999).\n\nDiplocynodon ratelii and all crocodylians closer to it than to Alligator mississippiensis.",
          "definitionSource": {
            "type": "article",
            "title": "Phylogenetic approaches toward crocodylian history",
            "authors": [
              {
                "name": "Christopher A. Brochu",
                "alternate": [
                  "Brochu, Christopher A."
                ],
                "firstname": "Christopher",
                "middlename": "A.",
                "lastname": "Brochu"
              }
            ],
            "year": 2003,
            "figure": "1",
            "identifier": [
              {
                "type": "doi",
                "id": "10.1146/annurev.earth.31.100901.141308"
              }
            ],
            "link": [
              {
                "url": "https://www.annualreviews.org/doi/10.1146/annurev.earth.31.100901.141308"
              }
            ],
            "journal": {
              "name": "Annual Review of Earth and Planetary Sciences",
              "volume": "31",
              "pages": "357--397",
              "identifier": [
                {
                  "type": "eISSN",
                  "id": "1545-4495"
                }
              ]
            }
          },
          "internalSpecifiers": [
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Diplocynodon ratelii",
                "nameComplete": "Diplocynodon ratelii",
                "genusPart": "Diplocynodon",
                "specificEpithet": "ratelii"
              }
            }
          ],
          "externalSpecifiers": [
            {
              "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
              "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nomenclaturalCode": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN",
                "label": "Alligator mississippiensis",
                "nameComplete": "Alligator mississippiensis",
                "genusPart": "Alligator",
                "specificEpithet": "mississippiensis"
              }
            }
          ],
          "expectedResolution": {
            "#phylogeny0": {
              "nodeLabel": "Diplocynodon ratelii",
              "description": "Only representative of the Diplocynodontinae clade in this phylogeny."
            }
          }
        }
      ],
      "defaultNomenclaturalCodeIRI": "http://rs.tdwg.org/ontology/voc/TaxonName#ICZN"
    }


The JSON structure of this file makes it easy to examine some aspects of it, such as the number of phylogenies and phyloreferences. 


```javascript
console.log(
    `brochu2003.json contains ${brochu2003.phylorefs.length} phyloreferences and ` +
    `${brochu2003.phylogenies.length} phylogeny.`
);
```

    brochu2003.json contains 6 phyloreferences and 1 phylogeny.


You can also examine characteristics of each phyloreference, such as the clade definition and the internal and external specifiers. However, note that not all specifiers have labels, and actually parsing the full taxonomic unit description for the specifier is very complicated.


```javascript
// List all the clade definitions in a Phyx file.
brochu2003.phylorefs.forEach((phyloref, index) => {
    console.log(`- Phyloref ${index + 1}. ${phyloref.label}:`);
    console.log(`  - Clade definition: ${phyloref.definition.replaceAll(/\s+/ig, ' ')}`);
    (phyloref.internalSpecifiers || []).forEach(specifier => {
        console.log(`  - Internal specifier: ${specifier.label}`);
    });
    (phyloref.externalSpecifiers || []).forEach(specifier => {
        console.log(`  - External specifier: ${specifier.label}`);
    });
    console.log();
});
```

    - Phyloref 1. Alligatoridae:
      - Clade definition: Alligatoridae (Cuvier 1807). Last common ancestor of Alligator mississippiensis and Caiman crocodilus and all of its descendents.
      - Internal specifier: undefined
      - Internal specifier: Alligator mississippiensis
    
    - Phyloref 2. Alligatorinae:
      - Clade definition: Alligatorinae (Kälin 1940). Alligator mississippiensis and all crocodylians closer to it than to Caiman crocodilus.
      - Internal specifier: undefined
      - External specifier: Caiman crocodilus
    
    - Phyloref 3. Caimaninae:
      - Clade definition: Caimaninae (Norell 1988). Caiman crocodilus and all crocodylians closer to it than to Alligator mississippiensis.
      - Internal specifier: undefined
      - External specifier: undefined
    
    - Phyloref 4. Crocodyloidea:
      - Clade definition: Crocodyloidea (Fitzinger 1826). Crocodylus niloticus and all crocodylians closer to it than to Alligator mississippiensis or Gavialis gangeticus.
      - Internal specifier: undefined
      - External specifier: Alligator mississippiensis
      - External specifier: Gavialis gangeticus
    
    - Phyloref 5. Crocodylidae:
      - Clade definition: Crocodylidae (Cuvier 1807). Definition dependent on phylogenetic context. Last common ancestor of Crocodylus niloticus, Osteolaemus tetraspis, and Tomistoma schlegelii and all of its descendents.
      - Internal specifier: undefined
      - Internal specifier: Osteolaemus tetraspis
      - Internal specifier: Crocodylus niloticus
    
    - Phyloref 6. Diplocynodontinae:
      - Clade definition: Diplocynodontinae (Brochu 1999). Diplocynodon ratelii and all crocodylians closer to it than to Alligator mississippiensis.
      - Internal specifier: undefined
      - External specifier: undefined
    


## Navigating a Phyx document using phyx.js

phyx.js wrappers can simplify the process of accessing these components. It consists of a series of [wrappers](https://www.phyloref.org/phyx.js/identifiers.html#wrappers), each of which wraps part of the JSON file. For example, we can wrap each specifier using the [TaxonomicUnitWrapper](https://www.phyloref.org/phyx.js/class/src/wrappers/TaxonomicUnitWrapper.js~TaxonomicUnitWrapper.html).

This provides a number of convenience methods: for example, `.internalSpecifiers` and `.externalSpecifiers` will always return lists, whether or not these are defined in the underlying phyloreference (in which case they return empty lists). There is also a `.specifiers` method that lists both internal and external specifiers.

Furthermore, taxonomic units that are taxon concepts can be wrapped by a [TaxonConceptWrapper](https://www.phyloref.org/phyx.js/class/src/wrappers/TaxonConceptWrapper.js~TaxonConceptWrapper.html), which have methods for accessing the "complete name" (i.e. the monomial, binomial or trinomial name) and the nomenclatural code.


```javascript
// Load the Phyx library.
var phyx = require('..');

// List all the phyloreferences with relevant information.
brochu2003.phylorefs.forEach(phyloref => {
    let wrappedPhyloref = new phyx.PhylorefWrapper(phyloref);
    
    console.log(wrappedPhyloref.label);
    
    wrappedPhyloref.internalSpecifiers.forEach(specifier => {
        let wrappedSpecifier = new phyx.TaxonomicUnitWrapper(specifier);
        if (wrappedSpecifier.taxonConcept) {
            let wrappedTaxonConcept = new phyx.TaxonConceptWrapper(wrappedSpecifier.taxonConcept);
            console.log(` - Internal: ${wrappedTaxonConcept.nameComplete} (${wrappedTaxonConcept.nomenCodeDetails.shortName})`);
        } else {
            console.log(` - Internal: ${wrappedSpecifier.label}`);
        }
    });
    
    wrappedPhyloref.externalSpecifiers.forEach(specifier => {
        let wrappedSpecifier = new phyx.TaxonomicUnitWrapper(specifier);
        if (wrappedSpecifier.taxonConcept) {
            let wrappedTaxonConcept = new phyx.TaxonConceptWrapper(wrappedSpecifier.taxonConcept);
            console.log(` - External: ${wrappedTaxonConcept.nameComplete} (${wrappedTaxonConcept.nomenCodeDetails.shortName})`);
        } else {
            console.log(` - External: ${wrappedSpecifier.label}`);
        }
    });
    
    console.log();
});
```

    Alligatoridae
     - Internal: Caiman crocodilus (ICZN)
     - Internal: Alligator mississippiensis (ICZN)
    
    Alligatorinae
     - Internal: Alligator mississippiensis (ICZN)
     - External: Caiman crocodilus (ICZN)
    
    Caimaninae
     - Internal: Caiman crocodilus (ICZN)
     - External: Alligator mississippiensis (ICZN)
    
    Crocodyloidea
     - Internal: Crocodylus niloticus (ICZN)
     - External: Alligator mississippiensis (ICZN)
     - External: Gavialis gangeticus (ICZN)
    
    Crocodylidae
     - Internal: Tomistoma schlegelii (ICZN)
     - Internal: Osteolaemus tetraspis (ICZN)
     - Internal: Crocodylus niloticus (ICZN)
    
    Diplocynodontinae
     - Internal: Diplocynodon ratelii (ICZN)
     - External: Alligator mississippiensis (ICZN)
    


## Converting a Phyx document into OWL

A Phyx document can be converted into OWL by using the `PhyxWrapper`.


```javascript
// The example RDF file uses a local @context for development purposes.
// We need to change it to use a URL @context.

brochu2003['@context'] = 'https://www.phyloref.org/phyx.js/context/v1.0.0/phyx.json';

nQuads = new phyx.PhyxWrapper(brochu2003).toRDF('http://example.org/test#');
nQuads
```




    `<http://example.org/test#phylogeny0> <http://ontology.phyloref.org/phyloref.owl#newick_expression> "(Parasuchia,(rauisuchians,Aetosauria,(sphenosuchians,(protosuchians,(mesosuchians,(Hylaeochampsa,Aegyptosuchus,Stomatosuchus,(Allodaposuchus,('Gavialis gangeticus',(('Diplocynodon ratelii',('Alligator mississippiensis','Caiman crocodilus')Alligatoridae)Alligatoroidea,('Tomistoma schlegelii',('Osteolaemus tetraspis','Crocodylus niloticus')Crocodylinae)Crocodylidae)Brevirostres)Crocodylia))Eusuchia)Mesoeucrocodylia)Crocodyliformes)Crocodylomorpha))root;" .\n` +
      '<http://example.org/test#phylogeny0> <http://purl.obolibrary.org/obo/CDAO_0000148> <http://example.org/test#phylogeny0_node0> .\n' +
      '<http://example.org/test#phylogeny0> <http://purl.org/dc/terms/source> _:b180 .\n' +
      '<http://example.org/test#phylogeny0> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://ontology.phyloref.org/phyloref.owl#ReferencePhylogenyEvidence> .\n' +
      '<http://example.org/test#phylogeny0> <http://www.w3.org/2000/01/rdf-schema#isDefinedBy> _:b0 .\n' +
      '<http://example.org/test#phylogeny0> <http://www.w3.org/2000/01/rdf-schema#label> "Fig 1 from Brochu 2003" .\n' +
      '<http://example.org/test#phylogeny0_node0> <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node1> .\n' +
      '<http://example.org/test#phylogeny0_node0> <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node29> .\n' +
      '<http://example.org/test#phylogeny0_node0> <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0> .\n' +
      '<http://example.org/test#phylogeny0_node0> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://purl.obolibrary.org/obo/CDAO_0000140> .\n' +
      '<http://example.org/test#phylogeny0_node0> <http://www.w3.org/2000/01/rdf-schema#label> "root" .\n' +
      '<http://example.org/test#phylogeny0_node10> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node13> .\n' +
      '<http://example.org/test#phylogeny0_node10> <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node11> .\n' +
      '<http://example.org/test#phylogeny0_node10> <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node12> .\n' +
      '<http://example.org/test#phylogeny0_node10> <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node9> .\n' +
      '<http://example.org/test#phylogeny0_node10> <http://purl.obolibrary.org/obo/CDAO_0000187> _:b56 .\n' +
      '<http://example.org/test#phylogeny0_node10> <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0> .\n' +
      '<http://example.org/test#phylogeny0_node10> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://purl.obolibrary.org/obo/CDAO_0000140> .\n' +
      '<http://example.org/test#phylogeny0_node10> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> _:b58 .\n' +
      '<http://example.org/test#phylogeny0_node10> <http://www.w3.org/2000/01/rdf-schema#label> "Crocodylinae" .\n' +
      '<http://example.org/test#phylogeny0_node11> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node12> .\n' +
      '<http://example.org/test#phylogeny0_node11> <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node10> .\n' +
      '<http://example.org/test#phylogeny0_node11> <http://purl.obolibrary.org/obo/CDAO_0000187> _:b63 .\n' +
      '<http://example.org/test#phylogeny0_node11> <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0> .\n' +
      '<http://example.org/test#phylogeny0_node11> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://purl.obolibrary.org/obo/CDAO_0000140> .\n' +
      '<http://example.org/test#phylogeny0_node11> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> _:b65 .\n' +
      '<http://example.org/test#phylogeny0_node11> <http://www.w3.org/2000/01/rdf-schema#label> "Crocodylus niloticus" .\n' +
      '<http://example.org/test#phylogeny0_node12> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node11> .\n' +
      '<http://example.org/test#phylogeny0_node12> <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node10> .\n' +
      '<http://example.org/test#phylogeny0_node12> <http://purl.obolibrary.org/obo/CDAO_0000187> _:b70 .\n' +
      '<http://example.org/test#phylogeny0_node12> <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0> .\n' +
      '<http://example.org/test#phylogeny0_node12> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://purl.obolibrary.org/obo/CDAO_0000140> .\n' +
      '<http://example.org/test#phylogeny0_node12> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> _:b72 .\n' +
      '<http://example.org/test#phylogeny0_node12> <http://www.w3.org/2000/01/rdf-schema#label> "Osteolaemus tetraspis" .\n' +
      '<http://example.org/test#phylogeny0_node13> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node10> .\n' +
      '<http://example.org/test#phylogeny0_node13> <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node9> .\n' +
      '<http://example.org/test#phylogeny0_node13> <http://purl.obolibrary.org/obo/CDAO_0000187> _:b77 .\n' +
      '<http://example.org/test#phylogeny0_node13> <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0> .\n' +
      '<http://example.org/test#phylogeny0_node13> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://purl.obolibrary.org/obo/CDAO_0000140> .\n' +
      '<http://example.org/test#phylogeny0_node13> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> _:b79 .\n' +
      '<http://example.org/test#phylogeny0_node13> <http://www.w3.org/2000/01/rdf-schema#label> "Tomistoma schlegelii" .\n' +
      '<http://example.org/test#phylogeny0_node14> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node9> .\n' +
      '<http://example.org/test#phylogeny0_node14> <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node15> .\n' +
      '<http://example.org/test#phylogeny0_node14> <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node18> .\n' +
      '<http://example.org/test#phylogeny0_node14> <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node8> .\n' +
      '<http://example.org/test#phylogeny0_node14> <http://purl.obolibrary.org/obo/CDAO_0000187> _:b84 .\n' +
      '<http://example.org/test#phylogeny0_node14> <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0> .\n' +
      '<http://example.org/test#phylogeny0_node14> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://purl.obolibrary.org/obo/CDAO_0000140> .\n' +
      '<http://example.org/test#phylogeny0_node14> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> _:b86 .\n' +
      '<http://example.org/test#phylogeny0_node14> <http://www.w3.org/2000/01/rdf-schema#label> "Alligatoroidea" .\n' +
      '<http://example.org/test#phylogeny0_node15> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node18> .\n' +
      '<http://example.org/test#phylogeny0_node15> <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node16> .\n' +
      '<http://example.org/test#phylogeny0_node15> <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node17> .\n' +
      '<http://example.org/test#phylogeny0_node15> <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node14> .\n' +
      '<http://example.org/test#phylogeny0_node15> <http://purl.obolibrary.org/obo/CDAO_0000187> _:b91 .\n' +
      '<http://example.org/test#phylogeny0_node15> <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0> .\n' +
      '<http://example.org/test#phylogeny0_node15> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://purl.obolibrary.org/obo/CDAO_0000140> .\n' +
      '<http://example.org/test#phylogeny0_node15> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> _:b93 .\n' +
      '<http://example.org/test#phylogeny0_node15> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> _:b98 .\n' +
      '<http://example.org/test#phylogeny0_node15> <http://www.w3.org/2000/01/rdf-schema#label> "Alligatoridae" .\n' +
      '<http://example.org/test#phylogeny0_node16> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node17> .\n' +
      '<http://example.org/test#phylogeny0_node16> <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node15> .\n' +
      '<http://example.org/test#phylogeny0_node16> <http://purl.obolibrary.org/obo/CDAO_0000187> _:b101 .\n' +
      '<http://example.org/test#phylogeny0_node16> <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0> .\n' +
      '<http://example.org/test#phylogeny0_node16> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://purl.obolibrary.org/obo/CDAO_0000140> .\n' +
      '<http://example.org/test#phylogeny0_node16> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> _:b103 .\n' +
      '<http://example.org/test#phylogeny0_node16> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> _:b108 .\n' +
      '<http://example.org/test#phylogeny0_node16> <http://www.w3.org/2000/01/rdf-schema#label> "Caiman crocodilus" .\n' +
      '<http://example.org/test#phylogeny0_node17> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node16> .\n' +
      '<http://example.org/test#phylogeny0_node17> <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node15> .\n' +
      '<http://example.org/test#phylogeny0_node17> <http://purl.obolibrary.org/obo/CDAO_0000187> _:b111 .\n' +
      '<http://example.org/test#phylogeny0_node17> <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0> .\n' +
      '<http://example.org/test#phylogeny0_node17> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://purl.obolibrary.org/obo/CDAO_0000140> .\n' +
      '<http://example.org/test#phylogeny0_node17> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> _:b113 .\n' +
      '<http://example.org/test#phylogeny0_node17> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> _:b118 .\n' +
      '<http://example.org/test#phylogeny0_node17> <http://www.w3.org/2000/01/rdf-schema#label> "Alligator mississippiensis" .\n' +
      '<http://example.org/test#phylogeny0_node18> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node15> .\n' +
      '<http://example.org/test#phylogeny0_node18> <'... 184323 more characters




```javascript
// We can convert these N-Quads into RDF/Turtle for easier interpretation.
var N3 = require('n3');
var { Readable } = require("stream")

var streamParser = new N3.StreamParser(),
    inputStream = Readable.from([nQuads]),
    streamWriter = new N3.StreamWriter();
inputStream.pipe(streamParser);
streamParser.pipe(streamWriter);
streamWriter.pipe(process.stdout);

undefined;
```

    <http://example.org/test#phylogeny0> <http://ontology.phyloref.org/phyloref.owl#newick_expression> "(Parasuchia,(rauisuchians,Aetosauria,(sphenosuchians,(protosuchians,(mesosuchians,(Hylaeochampsa,Aegyptosuchus,Stomatosuchus,(Allodaposuchus,('Gavialis gangeticus',(('Diplocynodon ratelii',('Alligator mississippiensis','Caiman crocodilus')Alligatoridae)Alligatoroidea,('Tomistoma schlegelii',('Osteolaemus tetraspis','Crocodylus niloticus')Crocodylinae)Crocodylidae)Brevirostres)Crocodylia))Eusuchia)Mesoeucrocodylia)Crocodyliformes)Crocodylomorpha))root;";
        <http://purl.obolibrary.org/obo/CDAO_0000148> <http://example.org/test#phylogeny0_node0>;
        <http://purl.org/dc/terms/source> _:b1_b180;
        a <http://ontology.phyloref.org/phyloref.owl#ReferencePhylogenyEvidence>;
        <http://www.w3.org/2000/01/rdf-schema#isDefinedBy> _:b1_b0;
        <http://www.w3.org/2000/01/rdf-schema#label> "Fig 1 from Brochu 2003".
    <http://example.org/test#phylogeny0_node0> <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node1>, <http://example.org/test#phylogeny0_node29>;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>;
        <http://www.w3.org/2000/01/rdf-schema#label> "root".
    <http://example.org/test#phylogeny0_node10> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node13>;
        <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node11>, <http://example.org/test#phylogeny0_node12>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node9>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b56;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b58;
        <http://www.w3.org/2000/01/rdf-schema#label> "Crocodylinae".
    <http://example.org/test#phylogeny0_node11> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node12>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node10>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b63;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b65;
        <http://www.w3.org/2000/01/rdf-schema#label> "Crocodylus niloticus".
    <http://example.org/test#phylogeny0_node12> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node11>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node10>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b70;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b72;
        <http://www.w3.org/2000/01/rdf-schema#label> "Osteolaemus tetraspis".
    <http://example.org/test#phylogeny0_node13> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node10>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node9>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b77;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b79;
        <http://www.w3.org/2000/01/rdf-schema#label> "Tomistoma schlegelii".
    <http://example.org/test#phylogeny0_node14> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node9>;
        <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node15>, <http://example.org/test#phylogeny0_node18>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node8>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b84;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b86;
        <http://www.w3.org/2000/01/rdf-schema#label> "Alligatoroidea".
    <http://example.org/test#phylogeny0_node15> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node18>;
        <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node16>, <http://example.org/test#phylogeny0_node17>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node14>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b91;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b93, _:b1_b98;
        <http://www.w3.org/2000/01/rdf-schema#label> "Alligatoridae".
    <http://example.org/test#phylogeny0_node16> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node17>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node15>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b101;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b103, _:b1_b108;
        <http://www.w3.org/2000/01/rdf-schema#label> "Caiman crocodilus".
    <http://example.org/test#phylogeny0_node17> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node16>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node15>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b111;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b113, _:b1_b118;
        <http://www.w3.org/2000/01/rdf-schema#label> "Alligator mississippiensis".
    <http://example.org/test#phylogeny0_node18> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node15>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node14>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b121;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b123, _:b1_b128;
        <http://www.w3.org/2000/01/rdf-schema#label> "Diplocynodon ratelii".
    <http://example.org/test#phylogeny0_node19> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node8>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node7>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b131;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b133;
        <http://www.w3.org/2000/01/rdf-schema#label> "Gavialis gangeticus".
    <http://example.org/test#phylogeny0_node1> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node29>;
        <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node27>, <http://example.org/test#phylogeny0_node28>, <http://example.org/test#phylogeny0_node2>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node0>;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>.
    <http://example.org/test#phylogeny0_node20> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node7>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node6>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b138;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b140;
        <http://www.w3.org/2000/01/rdf-schema#label> "Allodaposuchus".
    <http://example.org/test#phylogeny0_node21> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node22>, <http://example.org/test#phylogeny0_node23>, <http://example.org/test#phylogeny0_node6>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node5>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b145;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b147;
        <http://www.w3.org/2000/01/rdf-schema#label> "Stomatosuchus".
    <http://example.org/test#phylogeny0_node22> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node21>, <http://example.org/test#phylogeny0_node23>, <http://example.org/test#phylogeny0_node6>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node5>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b152;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b154;
        <http://www.w3.org/2000/01/rdf-schema#label> "Aegyptosuchus".
    <http://example.org/test#phylogeny0_node23> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node21>, <http://example.org/test#phylogeny0_node22>, <http://example.org/test#phylogeny0_node6>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node5>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b159;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b161;
        <http://www.w3.org/2000/01/rdf-schema#label> "Hylaeochampsa".
    <http://example.org/test#phylogeny0_node24> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node5>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node4>;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>;
        <http://www.w3.org/2000/01/rdf-schema#label> "mesosuchians".
    <http://example.org/test#phylogeny0_node25> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node4>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node3>;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>;
        <http://www.w3.org/2000/01/rdf-schema#label> "protosuchians".
    <http://example.org/test#phylogeny0_node26> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node3>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node2>;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>;
        <http://www.w3.org/2000/01/rdf-schema#label> "sphenosuchians".
    <http://example.org/test#phylogeny0_node27> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node28>, <http://example.org/test#phylogeny0_node2>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node1>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b166;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b168;
        <http://www.w3.org/2000/01/rdf-schema#label> "Aetosauria".
    <http://example.org/test#phylogeny0_node28> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node27>, <http://example.org/test#phylogeny0_node2>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node1>;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>;
        <http://www.w3.org/2000/01/rdf-schema#label> "rauisuchians".
    <http://example.org/test#phylogeny0_node29> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node1>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node0>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b173;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b175;
        <http://www.w3.org/2000/01/rdf-schema#label> "Parasuchia".
    <http://example.org/test#phylogeny0_node2> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node27>, <http://example.org/test#phylogeny0_node28>;
        <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node26>, <http://example.org/test#phylogeny0_node3>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node1>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b1;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b3;
        <http://www.w3.org/2000/01/rdf-schema#label> "Crocodylomorpha".
    <http://example.org/test#phylogeny0_node3> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node26>;
        <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node25>, <http://example.org/test#phylogeny0_node4>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node2>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b8;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b10;
        <http://www.w3.org/2000/01/rdf-schema#label> "Crocodyliformes".
    <http://example.org/test#phylogeny0_node4> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node25>;
        <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node24>, <http://example.org/test#phylogeny0_node5>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node3>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b15;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b17;
        <http://www.w3.org/2000/01/rdf-schema#label> "Mesoeucrocodylia".
    <http://example.org/test#phylogeny0_node5> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node24>;
        <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node21>, <http://example.org/test#phylogeny0_node22>, <http://example.org/test#phylogeny0_node23>, <http://example.org/test#phylogeny0_node6>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node4>;
        <http://purl.obolibrary.org/obo/CDAO_0000187> _:b1_b22;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>, _:b1_b24;
        <http://www.w3.org/2000/01/rdf-schema#label> "Eusuchia".
    <http://example.org/test#phylogeny0_node6> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node21>, <http://example.org/test#phylogeny0_node22>, <http://example.org/test#phylogeny0_node23>;
        <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node20>, <http://example.org/test#phylogeny0_node7>;
        <http://purl.obolibrary.org/obo/CDAO_0000179> <http://example.org/test#phylogeny0_node5>;
        <http://purl.obolibrary.org/obo/CDAO_0000200> <http://example.org/test#phylogeny0>;
        a <http://purl.obolibrary.org/obo/CDAO_0000140>.
    <http://example.org/test#phylogeny0_node7> <http://ontology.phyloref.org/phyloref.owl#has_Sibling> <http://example.org/test#phylogeny0_node20>;
        <http://purl.obolibrary.org/obo/CDAO_0000149> <http://example.org/test#phylogeny0_node19>, <http://example.org/test#phylogeny0_node8>

## About this notebook

This is a [Jupyter Notebook](https://jupyter.org/). We recommend installing [Jupyterlab via Homebrew on Mac](https://formulae.brew.sh/formula/jupyterlab#default), but [other installation options are available](https://jupyter.org/install). Once Jupyter Notebook is set up, you should be able to open this notebook for editing by running `jupyter notebook Introduction\ to\ phyx.js.ipynb` from the command line.

We use [IJavascript](https://github.com/n-riesco/ijavascript) to use Javascript as a kernel in Jupyter Notebook. If you would like to edit this notebook, you will need to [install this](https://github.com/n-riesco/ijavascript#installation) as well.
