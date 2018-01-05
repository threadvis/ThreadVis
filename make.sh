#!/bin/bash

# * *****************************************************************************
# * This file is part of ThreadVis.
# * http://threadvis.github.io/
# *
# * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
# * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
# * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
# * An electronic version of the thesis is available online at
# * http://www.iicm.tugraz.at/ahubmann.pdf
# *
# * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
# * Copyright (C) 2007, 2008, 2009, 2010, 2011,
# *               2013, 2018 Alexander C. Hubmann-Haidvogel
# *
# * ThreadVis is free software: you can redistribute it and/or modify it under
# * the terms of the GNU Affero General Public License as published by the Free
# * Software Foundation, either version 3 of the License, or (at your option) any
# * later version.
# *
# * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY
# * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# * details.
# *
# * You should have received a copy of the GNU Affero General Public License
# * along with ThreadVis. If not, see <http://www.gnu.org/licenses/>.
# *
# * Version: $Id$
# * *****************************************************************************
# * Makefile for ThreadVis
# ******************************************************************************/



SVN=/usr/bin/svn



# ##############################################################################
# Get newest version
# ##############################################################################

version=`cat src/version`
revision=`cat src/revision`



# ##############################################################################
# Delete old build
# ##############################################################################

rm -Rf build/*
mkdir build/src



# ##############################################################################
# Copy all files to build directory
# ##############################################################################

cp -r src/* build/src



# ##############################################################################
# Update code with version and revision
# ##############################################################################

# update in user-visible files
for f in $(find build/ -name '*.dtd' -or -name '*.rdf')
do
    sed -i '' -e "s/\[\[version\]\]/${version}/g" $f
    sed -i '' -e "s/\[\[build\]\]/${revision}/g" $f
done

# update in all files
for f in $(find build/ -name '*.dtd' -or -name '*.rdf' -or -name '*.js' -or -name '*.xul' -or -name '*.css')
do
    sed -i '' -e "s/[$]Id[$]/${version}.${revision}/g" $f
done



# ##############################################################################
# Create JAR file
# ##############################################################################

cd build/src/chrome
zip -q -r threadvis.jar . -i@../../../jar.filelist
cd ../../..



# ##############################################################################
# Create XPI file
# ##############################################################################

cd build/src
zip -q -r ThreadVis.xpi . -i@../../xpi.filelist
cd ../..
cp build/src/ThreadVis.xpi build/ThreadVis.xpi



# ##############################################################################
# Create XPI file for addons.mozilla.org
# (remove the updateURL and updateKey lines)
# ##############################################################################

sed -i '' -e '/<em:updateURL>.*<\/em:updateURL>/d' build/src/install.rdf
sed -i '' -e '/<em:updateKey>.*<\/em:updateKey>/d' build/src/install.rdf
cd build/src
zip -q -r ThreadVis-addons.mozilla.org.xpi . -i@../../xpi.filelist
cd ../..
cp build/src/ThreadVis-addons.mozilla.org.xpi build/ThreadVis-addons.mozilla.org.xpi



# ##############################################################################
# Include the update hash for the created XPI file
# Sign the file
# Copy to output directory
# ##############################################################################

sha512sum=`shasum -a 512 build/ThreadVis.xpi | awk '{print $1}'`
sed -i '' -e "s/\[\[updatehash\]\]/sha512:${sha512sum}/g" build/src/update.rdf
cp build/src/update.rdf build/update.rdf



# ##############################################################################
# Clean up build directory
# ##############################################################################
rm -Rf build/src



echo "Build $version.$revision successful."
