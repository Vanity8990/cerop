
BASENAME=$1

# programs

## darwin
# BIN_PATH=/Users/namlook/Documents/projets/ceropath/bin
# MUSCLE=$BIN_PATH/darwin/muscle3.8.31_i86darwin64
# BIONJ=$BIN_PATH/darwin/BIONJ_MacOS
# DNADIST=dnadist # installed via brew

## linux
BIN_PATH=/app/bin
MUSCLE=$BIN_PATH/muscle3.8.31_i86linux32
BIONJ=$BIN_PATH/BIONJ_linux
DNADIST=/usr/lib/phylip/bin/dnadist
DNADIST_CONFIG=$BIN_PATH/dnadist.cfg
NWK2SVG=$BIN_PATH/nwk2svg.r

# files
COI_AFA=$BIN_PATH/files/coi_cbgp.afa

$MUSCLE -in $BASENAME -out $BASENAME.afa &&
$MUSCLE -profile -in1 $COI_AFA -in2 $BASENAME.afa -phyiout infile -maxiters 1 -diags &&
cat $DNADIST_CONFIG | $DNADIST &&
$BIONJ outfile $BASENAME.nwk &&
Rscript $NWK2SVG $BASENAME.nwk $PWD &&
rm $BASENAME.afa outfile infile
