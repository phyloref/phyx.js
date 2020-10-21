#!/bin/bash

# Run the full test-all-combinations pipeline to test every possible phylogeny
# with a given number of leaf nodes.
MAX_LEAF_NODES=6

# Java settings.
JAVA_ARGS=-Xmx16G

# Clean up output and log files.
./clean.sh

# Download JPhyloRef if needed.
# ./download.sh

# We process the output for every file from n=1 to n=$MAX_LEAF_NODES.
for n in $(seq 2 $MAX_LEAF_NODES); do
    DIR=n$n
    mkdir -p $DIR

    echo "Creating phylogenies for n=$n";
    npm run generate-every-topology -- -n $n --multifurcating > $DIR/stdout.txt 2> $DIR/stderr.txt

    echo "Preparing output directories";
    mkdir -p $DIR/stdout
    mkdir -p $DIR/stderr
    mkdir -p $DIR/success
    mkdir -p $DIR/failure

    echo "Testing all Phyx files for n=$n";
    for phyx in $DIR/*.jsonld; do
        FILENAME=$(basename $phyx)
        printf " - Testing $phyx: ";
        if java $JAVA_ARGS -jar jphyloref.jar test $phyx --json > $DIR/stdout/$FILENAME.txt 2> $DIR/stderr/$FILENAME.txt; then
            printf "OK\n"
            cp $DIR/stdout/$FILENAME.txt $DIR/success/$FILENAME-stdout.txt
            cp $DIR/stderr/$FILENAME.txt $DIR/success/$FILENAME-stderr.txt
        else
            printf "FAILED\n"
            cp $DIR/stdout/$FILENAME.txt $DIR/failure/$FILENAME-stdout.txt
            cp $DIR/stderr/$FILENAME.txt $DIR/failure/$FILENAME-stderr.txt
        fi
    done
done
