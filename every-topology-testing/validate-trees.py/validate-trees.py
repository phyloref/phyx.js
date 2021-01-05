# Import DendroPy
import dendropy

# For now, let's see if we can replicate the finding on the n4 dataset.
# Eventually, we'll validate them all.

def tree_diff(t1, t2):
  return dendropy.calculate.treecompare.symmetric_difference(
    t1,
    t2
  )
 
def is_identical(t1, t2):
  return dendropy.calculate.treecompare.symmetric_difference(
    t1,
    t2
  ) == 0

def validateNexusFile(nexusFilePath):
  taxa = dendropy.TaxonNamespace()
  trees = dendropy.TreeList.get(path=nexusFilePath, schema="nexus", taxon_namespace=taxa)
  print(f"Loaded {len(trees)} trees from {nexusFilePath} with taxon namespace {taxa}.")

  # Are all trees unique? If not, which ones are duplicates?
  duplicate_count = 0
  for index1, t1 in enumerate(trees, start=1):
    for index2, t2 in enumerate(trees, start=1):
      t1.encode_bipartitions()
      t2.encode_bipartitions()
      if t1 != t2:
        if is_identical(t1, t2):
          print(f"Duplicate found: {t1} ({index1}) is identical to {t2} ({index2}): {tree_diff(t1, t2)}")
          duplicate_count += 1
        else:
          # print(f"Duplicate not found: {t1} ({index1}) is different from {t2} ({index2}): {tree_diff(t1, t2)}")
          continue
  if duplicate_count == 0:
    print(f"No duplicates found in {nexusFilePath}.")
  else:
    print(f"WARNING: {duplicate_count} duplicates found in {nexusFilePath}.")

for n in range(3, 7):
  validateNexusFile(f"../n{n}/trees.nex")
