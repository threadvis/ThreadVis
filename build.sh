#!/bin/sh

# * ********************************************************************************************************************
# * This file is part of ThreadVis.
# * https://threadvis.github.io/
# *
# * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis titled
# * "ThreadVis for Thunderbird: A Thread Visualisation Extension for the Mozilla Thunderbird Email Client"
# * at Graz University of Technology, Austria. An electronic version of the thesis is available online at
# * https://ftp.isds.tugraz.at/pub/theses/ahubmann.pdf
# *
# * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
# * Copyright (C) 2007, 2008, 2009, 2010, 2011, 2013, 2018, 2019, 2020, 2021, 2022, 2023 Alexander C. Hubmann-Haidvogel
# *
# * ThreadVis is free software: you can redistribute it and/or modify it under the terms of the
# * GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License,
# * or (at your option) any later version.
# *
# * ThreadVis is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
# * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# * See the GNU Affero General Public License for more details.
# *
# * You should have received a copy of the GNU Affero General Public License along with ThreadVis.
# * If not, see <http://www.gnu.org/licenses/>.
# *
# * ********************************************************************************************************************
# * Makefile for ThreadVis
# *********************************************************************************************************************/



# ######################################################################################################################
# Get newest version
# ######################################################################################################################

version=`cat src/version`
hash=`git rev-parse --short HEAD`
timestamp=`date +"%s"`



# ######################################################################################################################
# Delete old build
# ######################################################################################################################

rm -Rf build/*
mkdir build/src



# ######################################################################################################################
# Copy all files to build directory
# ######################################################################################################################

cp -r src/* build/src



# ######################################################################################################################
# Update code with version and revision
# ######################################################################################################################

# first, check if our build is clean
versionstring="${version}"
if [[ -n $(git status -s ./src) ]]; then
    versionstring="${versionstring}.${hash}.${timestamp}"
fi

# update in user-visible files
for f in $(find build/ -name '*.json' -or -name '*.dtd')
do
    sed -i '' -e "s/\[\[version\]\]/${versionstring}/g" $f
done

# update in all files
for f in $(find build/ -name '*.js' -or -name '*.jsm' -or -name '*.xhtml' -or -name '*.css' -or -name '*.json')
do
    sed -i '' -e "s/[$]Id[$]/${versionstring}/g" $f
done



# ######################################################################################################################
# Create XPI file
# ######################################################################################################################

cd build/src
zip -q -r ThreadVis.xpi . -i@../../xpi.filelist
cd ../..
cp build/src/ThreadVis.xpi build/ThreadVis.xpi



# ######################################################################################################################
# Clean up build directory
# ######################################################################################################################
rm -Rf build/src



echo "Build ${versionstring} successful."
