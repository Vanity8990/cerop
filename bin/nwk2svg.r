#!/usr/bin/Rscript

#setwd ("/home/namlook/Documents/projets/ceropath/data/pipeline")
args <- commandArgs(TRUE)
setwd (args[2])
require(ape)
#require(Cairo)
#require(RSVGTipsDevice)
require(RSvgDevice)
a<-read.tree(file=args[1])
b<-root(a, "R5241_Cann", resolve.root = T, interactive = F)
nb<-Ntip (b) + 2
bc<-rotate(b, nb , polytom = c(1, 2))
write.tree(phy=bc, file="final.nwk")
# xrange<-c(0,1)
# yrange<-c(0,550)
## devSVGTips(file=paste(args[1],"svg", sep="."), height=150, width=60)
# devSVG(file=paste(args[1],"svg", sep="."), height=150, width=60)
# plot(bc, font = 3, x.lim = xrange, y.lim = yrange, cex = 1.5)
# dev.off()

#setwd ("/tmp")
#args <- commandArgs(TRUE)
#require(ape)
#require(Cairo)
#a<-read.tree(file=args[1])
#b<-root(a, "R5241_Cann", resolve.root = T, interactive = F)
##bc<-rotate(b, 544, polytom = c(1, 2))
#xrange<-c(0,1)
#yrange<-c(0,550)
#CairoSVG(file=paste(args[1],"svg", sep="."), height=60, width=20, pointsize = 10)
#plot(b, font = 3, x.lim = xrange, y.lim = yrange, cex = .7)
#dev.off()

