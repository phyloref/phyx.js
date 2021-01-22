#!/usr/bin/python3
#
# validate_trees.py: A Python script for testing the topologies generated for
# all topology testing.
#
# The testing we do here is pretty simple: we report on the number of topologies
# generated in the 'n*' directories in the parent directory and on whether the
# Nexus file contains any duplicates. If the number of topologies is the expected
# number, each topology contains the expected number of leaf nodes, and there are
# no duplicates, then we can be sure that we have generated all topologies correctly.
#
# In order to test that this script itself works, we include a 'duplicates.nex'
# file in the current directory. This file is based on n3/trees.nex, which we
# expect to contain 15 binary trees and 11 multifurcating trees. This modified
# version of the file includes some duplicate topologies to ensure that we can
# detect them.
#

# We use the dendropy library to load Nexus files and do comparisons of trees.
import dendropy

# Calculate the unweighted Robinson-Foulds distance between two trees. This is
# defined as the number of partitions implied by the first tree but not the
# second (A) + the number of partitions implied by the second tree but not the
# first (B). This is an integer, which should be zero if the two trees represent
# the same evolutionary hypothesis.
#
# See https://dendropy.org/library/treecompare.html#dendropy.calculate.treecompare.symmetric_difference
# for more details.
def tree_diff(t1, t2):
  return dendropy.calculate.treecompare.symmetric_difference(
    t1,
    t2
  )

# Helper method to test if two trees are identical.
def is_identical(t1, t2):
  return tree_diff(t1, t2) == 0

# Test whether the provided tree is bifurcating.
# There doesn't appear to be a dendropy method to do this, so
# we do it by checking whether every node in this tree is
# either:
#   (1) A child node, or
#   (2) Has exactly two children.
def is_bifurcating(tree):
  return len(list(filter(lambda node: (
    # Is this a leaf node?
    len(node.child_nodes()) == 0 or
    # If not, does it have exactly two children?
    len(node.child_nodes()) == 2
  ), tree.nodes()))) == len(tree.nodes())

# Validate the provided Nexus file. This includes:
#   - Counting the number of total trees, bifurcating and multifurcating trees
#     in the Nexus file.
#   - Comparing every tree to every other tree to ensure that they are not identical.
def validateNexusFile(nexusFilePath):
  # All trees must share the same taxon namespace so that they can be compared.
  taxa = dendropy.TaxonNamespace()

  # Load trees.
  trees = dendropy.TreeList.get(path=nexusFilePath, schema="nexus", taxon_namespace=taxa)

  # Count bifurcating and multifurcating trees, count taxa, and report counts.
  bifurcating_trees = list(tree for tree in trees if is_bifurcating(tree))
  multifurcating_trees = list(tree for tree in trees if not is_bifurcating(tree))
  print(f"Loaded {len(trees)} ({len(bifurcating_trees)} bifurcating, {len(multifurcating_trees)} multifurcating) trees from {nexusFilePath} with taxon namespace {taxa} ({len(taxa)} taxa).")

  # Make sure that every tree has the same number of leaf nodes.
  leaf_node_counts = set(len(tree.leaf_nodes()) for tree in trees)
  if len(leaf_node_counts) != 1 or not (len(taxa) in leaf_node_counts):
    print(f"Every tree should have the same leaf node count ({len(taxa)}), but instead we have: {leaf_node_counts}\n")

  # Are all trees unique? If not, which ones are duplicates?
  duplicate_count = 0
  for index1, t1 in enumerate(trees, start=1):
    # is_identical() can't work unless we calculate bipartitions first.
    t1.encode_bipartitions()
    for index2, t2 in enumerate(trees, start=1):
      t2.encode_bipartitions()

      # Don't compare a tree to itself.
      if t1 != t2:
        if is_identical(t1, t2):
          print(f"Duplicate found: {t1} ({t1.label}, index {index1}) is identical to {t2} ({t2.label}, index {index2}): {tree_diff(t1, t2)}")
          duplicate_count += 1
        else:
          # print(f"Duplicate not found: {t1} ({index1}) is different from {t2} ({index2}): {tree_diff(t1, t2)}")
          continue

  if duplicate_count == 0:
    print(f"No duplicates found in {nexusFilePath}.")
  else:
    print(f"WARNING: {duplicate_count} duplicates found in {nexusFilePath}.\n")

# We start by trying to validate 'duplicates.nex',
# which is based on n4/trees.nex but includes some
# duplicates.
validateNexusFile("./duplicates.nex")

# We validate every file from n3 to n6.
maxN = 6
for n in range(3, maxN + 1):
  validateNexusFile(f"../n{n}/trees.nex")
