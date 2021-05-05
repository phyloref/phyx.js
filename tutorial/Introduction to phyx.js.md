# Introduction to phyx.js

This tutorial provides an introduction to the phyx.js library, and shows you how it can be used to read a Phyx file, check it for validity, examine [phyloreferences](https://www.phyloref.org/), phylogenies and specifiers, and describe how to convert the file into RDF.

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
console.log(JSON.stringify(brochu2003, null, 2).substring(0, 200) + '...');
```

    {
      "@context": "../../../docs/context/development/phyx.json",
      "doi": "10.5281/zenodo.4562685",
      "source": {
        "authors": [
          {
            "firstname": "Gaurav",
            "lastname": "Vaidya"
       ...


The JSON structure of this file makes it easy to examine some aspects of it, such as by iterating through the phylogenies and phyloreferences.


```javascript
// List all the clade definitions in a Phyx file.
brochu2003.phylorefs.forEach((phyloref, index) => {
    console.log(`- Phyloref ${index + 1}. ${phyloref.label}:`);
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
      - Internal specifier: undefined
      - Internal specifier: Alligator mississippiensis
    
    - Phyloref 2. Alligatorinae:
      - Internal specifier: undefined
      - External specifier: Caiman crocodilus
    
    - Phyloref 3. Caimaninae:
      - Internal specifier: undefined
      - External specifier: undefined
    
    - Phyloref 4. Crocodyloidea:
      - Internal specifier: undefined
      - External specifier: Alligator mississippiensis
      - External specifier: Gavialis gangeticus
    
    - Phyloref 5. Crocodylidae:
      - Internal specifier: undefined
      - Internal specifier: Osteolaemus tetraspis
      - Internal specifier: Crocodylus niloticus
    
    - Phyloref 6. Diplocynodontinae:
      - Internal specifier: undefined
      - External specifier: undefined
    


## Validating a Phyx document using JSON Schema

We include a [JSON Schema](https://www.phyloref.org/phyx.js/context/v1.0.0/schema.json) with phyx.js. This can be used to validate that a Phyx document is correctly formed by using [Ajv](https://ajv.js.org/), a JSON Schema validator for JavaScript.


```javascript
var Ajv = require('ajv');

// Configure Ajv.
var ajv = new Ajv({
    allErrors: true, // Display all error messages, not just the first.
});

// We use the JSON Schema included with this repository, but you can download the
// Phyx JSON Schema from https://www.phyloref.org/phyx.js/context/v1.0.0/schema.json
var validator = ajv.compile(JSON.parse(fs.readFileSync('../docs/context/v1.0.0/schema.json')));

// Attempt to validate the Brochu 2003 example file.
var result = validator(brochu2003);
console.log(`Is brochu2003 valid? ${result}`);
console.log('Errors:', validator.errors);

// Let's make an invalid copy of the Brochu 2003 example file to make sure this is working.
var brochu2003copy = {...brochu2003};
delete brochu2003copy['@context'];

var result = validator(brochu2003copy);
console.log(`Is brochu2003copy valid? ${result}`);
console.log('Errors:', validator.errors);
```

    Is brochu2003 valid? true
    Errors: null
    Is brochu2003copy valid? false
    Errors: [
      {
        keyword: 'required',
        dataPath: '',
        schemaPath: '#/required',
        params: { missingProperty: '@context' },
        message: "should have required property '@context'"
      }
    ]


## Navigating a Phyx document using phyx.js

### Examining phyloreferences, taxonomic units and taxon concepts

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
    


### Examining phylogenies

Phylogenies are stored in JSON files as Newick strings, but the [PhylogenyWrapper](https://www.phyloref.org/phyx.js/class/src/wrappers/PhylogenyWrapper.js~PhylogenyWrapper.html) can be used to look at internal and terminal node labels and to translate the Newick string into a JSON structure for examination.


```javascript
var firstPhylogeny = brochu2003.phylogenies[0];
console.log(`The first phylogeny is represented by the Newick string: ${firstPhylogeny.newick}`);
console.log();

// Display internal and external nodes.
var wrappedPhylogeny = new phyx.PhylogenyWrapper(firstPhylogeny);
console.log(`This consists of the following nodes:\n - Internal nodes: ${wrappedPhylogeny.getNodeLabels('internal').join(', ')}`);
console.log(` - External nodes: ${wrappedPhylogeny.getNodeLabels('terminal').join(', ')}`);
console.log();

// Convert the Newick string into a JSON structure for examination.
console.log(`Newick string as a JSON structure: ${JSON.stringify(phyx.PhylogenyWrapper.getParsedNewick(firstPhylogeny.newick), undefined, 2)}`);
console.log();
```

    The first phylogeny is represented by the Newick string: (Parasuchia,(rauisuchians,Aetosauria,(sphenosuchians,(protosuchians,(mesosuchians,(Hylaeochampsa,Aegyptosuchus,Stomatosuchus,(Allodaposuchus,('Gavialis gangeticus',(('Diplocynodon ratelii',('Alligator mississippiensis','Caiman crocodilus')Alligatoridae)Alligatoroidea,('Tomistoma schlegelii',('Osteolaemus tetraspis','Crocodylus niloticus')Crocodylinae)Crocodylidae)Brevirostres)Crocodylia))Eusuchia)Mesoeucrocodylia)Crocodyliformes)Crocodylomorpha))root;
    
    This consists of the following nodes:
     - Internal nodes: Alligatoridae, Alligatoroidea, Crocodylinae, Crocodylidae, Brevirostres, Crocodylia, Eusuchia, Mesoeucrocodylia, Crocodyliformes, Crocodylomorpha, root
     - External nodes: Parasuchia, rauisuchians, Aetosauria, sphenosuchians, protosuchians, mesosuchians, Hylaeochampsa, Aegyptosuchus, Stomatosuchus, Allodaposuchus, Gavialis gangeticus, Diplocynodon ratelii, Alligator mississippiensis, Caiman crocodilus, Tomistoma schlegelii, Osteolaemus tetraspis, Crocodylus niloticus
    
    Newick string as a JSON structure: {
      "json": {
        "label": "root",
        "children": [
          {
            "children": [
              {
                "label": "Crocodylomorpha",
                "children": [
                  {
                    "label": "Crocodyliformes",
                    "children": [
                      {
                        "label": "Mesoeucrocodylia",
                        "children": [
                          {
                            "label": "Eusuchia",
                            "children": [
                              {
                                "children": [
                                  {
                                    "label": "Crocodylia",
                                    "children": [
                                      {
                                        "label": "Brevirostres",
                                        "children": [
                                          {
                                            "label": "Crocodylidae",
                                            "children": [
                                              {
                                                "label": "Crocodylinae",
                                                "children": [
                                                  {
                                                    "label": "Crocodylus niloticus",
                                                    "name": "Crocodylus niloticus"
                                                  },
                                                  {
                                                    "label": "Osteolaemus tetraspis",
                                                    "name": "Osteolaemus tetraspis"
                                                  }
                                                ],
                                                "name": "Crocodylinae"
                                              },
                                              {
                                                "label": "Tomistoma schlegelii",
                                                "name": "Tomistoma schlegelii"
                                              }
                                            ],
                                            "name": "Crocodylidae"
                                          },
                                          {
                                            "label": "Alligatoroidea",
                                            "children": [
                                              {
                                                "label": "Alligatoridae",
                                                "children": [
                                                  {
                                                    "label": "Caiman crocodilus",
                                                    "name": "Caiman crocodilus"
                                                  },
                                                  {
                                                    "label": "Alligator mississippiensis",
                                                    "name": "Alligator mississippiensis"
                                                  }
                                                ],
                                                "name": "Alligatoridae"
                                              },
                                              {
                                                "label": "Diplocynodon ratelii",
                                                "name": "Diplocynodon ratelii"
                                              }
                                            ],
                                            "name": "Alligatoroidea"
                                          }
                                        ],
                                        "name": "Brevirostres"
                                      },
                                      {
                                        "label": "Gavialis gangeticus",
                                        "name": "Gavialis gangeticus"
                                      }
                                    ],
                                    "name": "Crocodylia"
                                  },
                                  {
                                    "label": "Allodaposuchus",
                                    "name": "Allodaposuchus"
                                  }
                                ]
                              },
                              {
                                "label": "Stomatosuchus",
                                "name": "Stomatosuchus"
                              },
                              {
                                "label": "Aegyptosuchus",
                                "name": "Aegyptosuchus"
                              },
                              {
                                "label": "Hylaeochampsa",
                                "name": "Hylaeochampsa"
                              }
                            ],
                            "name": "Eusuchia"
                          },
                          {
                            "label": "mesosuchians",
                            "name": "mesosuchians"
                          }
                        ],
                        "name": "Mesoeucrocodylia"
                      },
                      {
                        "label": "protosuchians",
                        "name": "protosuchians"
                      }
                    ],
                    "name": "Crocodyliformes"
                  },
                  {
                    "label": "sphenosuchians",
                    "name": "sphenosuchians"
                  }
                ],
                "name": "Crocodylomorpha"
              },
              {
                "label": "Aetosauria",
                "name": "Aetosauria"
              },
              {
                "label": "rauisuchians",
                "name": "rauisuchians"
              }
            ]
          },
          {
            "label": "Parasuchia",
            "name": "Parasuchia"
          }
        ],
        "name": "root"
      }
    }
    


### Accessing citations

Another example of a wrapper that can be used for wrapping a part of a Phyx file is the [CitationWrapper](https://www.phyloref.org/phyx.js/class/src/wrappers/CitationWrapper.js~CitationWrapper.html). This can be used to wrap citations anywhere in the Phyx file to provide a full bibliographic citation for the citation.


```javascript
var wrappedSourceCitation = new phyx.CitationWrapper(brochu2003.source);
console.log(`The source of this Phyx file is: ${wrappedSourceCitation.toString()}`);

var wrappedPhylogenyCitation = new phyx.CitationWrapper(brochu2003.phylogenies[0].source);
console.log(`The source of the first phylogeny in this file is: ${wrappedPhylogenyCitation.toString()}`);
```

    The source of this Phyx file is: Gaurav Vaidya (2021) Digital representation of some of the clade definitions in Brochu 2003 in the Phyloreference Exchange (Phyx) format  doi: 10.5281/zenodo.4562685
    The source of the first phylogeny in this file is: Christopher A. Brochu (2003) Phylogenetic approaches toward crocodylian history Annual Review of Earth and Planetary Sciences 31:357--397  fig 1 doi: 10.1146/annurev.earth.31.100901.141308 URL: https://www.annualreviews.org/doi/10.1146/annurev.earth.31.100901.141308


## Converting a Phyx document into OWL

A Phyx document can be converted into OWL by using the `PhyxWrapper`.


```javascript
// The example RDF file uses a local @context for development purposes.
// We need to change it to use the standard @context.

brochu2003['@context'] = 'https://www.phyloref.org/phyx.js/context/v1.0.0/phyx.json';

nQuads = new phyx.PhyxWrapper(brochu2003).toRDF('http://example.org/test#');
nQuads.then(nq => console.log(nq.slice(0, 926) + '...'));
```

    <http://example.org/test#phylogeny0> <http://ontology.phyloref.org/phyloref.owl#newick_expression> "(Parasuchia,(rauisuchians,Aetosauria,(sphenosuchians,(protosuchians,(mesosuchians,(Hylaeochampsa,Aegyptosuchus,Stomatosuchus,(Allodaposuchus,('Gavialis gangeticus',(('Diplocynodon ratelii',('Alligator mississippiensis','Caiman crocodilus')Alligatoridae)Alligatoroidea,('Tomistoma schlegelii',('Osteolaemus tetraspis','Crocodylus niloticus')Crocodylinae)Crocodylidae)Brevirostres)Crocodylia))Eusuchia)Mesoeucrocodylia)Crocodyliformes)Crocodylomorpha))root;" .
    <http://example.org/test#phylogeny0> <http://purl.obolibrary.org/obo/CDAO_0000148> <http://example.org/test#phylogeny0_node0> .
    <http://example.org/test#phylogeny0> <http://purl.org/dc/terms/source> _:b180 .
    <http://example.org/test#phylogeny0> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://ontology.phyloref.org/phyloref.owl#ReferencePhylogenyEvidence> ....



```javascript
// We can convert these N-Quads into RDF/Turtle for easier interpretation.
// We only convert a few N-Quads as a demonstration.
var N3 = require('n3');
var { Readable } = require("stream")

nQuads.then(nq => {
    someNqs = nq.slice(0, 926)

    var streamParser = new N3.StreamParser(),
    inputStream = Readable.from([someNqs]),
    streamWriter = new N3.StreamWriter();

    inputStream.pipe(streamParser);
    streamParser.pipe(streamWriter);
    streamWriter.pipe(process.stdout);
});

undefined;
```

    <http://example.org/test#phylogeny0> <http://ontology.phyloref.org/phyloref.owl#newick_expression> "(Parasuchia,(rauisuchians,Aetosauria,(sphenosuchians,(protosuchians,(mesosuchians,(Hylaeochampsa,Aegyptosuchus,Stomatosuchus,(Allodaposuchus,('Gavialis gangeticus',(('Diplocynodon ratelii',('Alligator mississippiensis','Caiman crocodilus')Alligatoridae)Alligatoroidea,('Tomistoma schlegelii',('Osteolaemus tetraspis','Crocodylus niloticus')Crocodylinae)Crocodylidae)Brevirostres)Crocodylia))Eusuchia)Mesoeucrocodylia)Crocodyliformes)Crocodylomorpha))root;";
        <http://purl.obolibrary.org/obo/CDAO_0000148> <http://example.org/test#phylogeny0_node0>;
        <http://purl.org/dc/terms/source> _:b0_b180;
        a <http://ontology.phyloref.org/phyloref.owl#ReferencePhylogenyEvidence>.


## About this notebook

This is a [Jupyter Notebook](https://jupyter.org/). We recommend installing [Jupyterlab via Homebrew on Mac](https://formulae.brew.sh/formula/jupyterlab#default), but [other installation options are available](https://jupyter.org/install). Once Jupyter Notebook is set up, you should be able to open this notebook for editing by running `jupyter notebook Introduction\ to\ phyx.js.ipynb` from the command line.

We use [IJavascript](https://github.com/n-riesco/ijavascript) to use Javascript as a kernel in Jupyter Notebook. If you would like to edit this notebook, you will need to [install this](https://github.com/n-riesco/ijavascript#installation) as well.
