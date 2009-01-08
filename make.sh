#!/bin/bash

# * *****************************************************************************
# * This file is part of ThreadVis.
# * http://threadvis.mozdev.org/
# *
# * ThreadVis started as part of Alexander C. Hubmann-Haidvogel's Master's Thesis
# * titled "ThreadVis for Thunderbird: A Thread Visualisation Extension for the
# * Mozilla Thunderbird Email Client" at Graz University of Technology, Austria.
# * An electronic version of the thesis is available online at
# * http://www.iicm.tugraz.at/ahubmann.pdf
# *
# * Copyright (C) 2005, 2006, 2007 Alexander C. Hubmann
# * Copyright (C) 2007, 2008 Alexander C. Hubmann-Haidvogel
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



SVN=/opt/subversion/bin/svn



# ##############################################################################
# Get newest revision
# ##############################################################################

svninfo=`$SVN info -r HEAD src`
revision=`echo $svninfo | sed -e 's/.* Revision: \([0-9]*\) .*/\1/'`

# check if any changed files exist
svnstatus=`$SVN status src`
modified=`echo $svnstatus | grep "M "`
if [ "$modified" != "" ]; then
	revision="$revision.dev"
fi



# ##############################################################################
# Get newest version
# ##############################################################################

version=`cat src/version`



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

sed -i -e "s/<<version>>/${version}/g" build/src/chrome/locale/de-DE/Settings.dtd
sed -i -e "s/<<build>>/${revision}/g" build/src/chrome/locale/de-DE/Settings.dtd

sed -i -e "s/<<version>>/${version}/g" build/src/chrome/locale/de-DE/ThreadVis.dtd
sed -i -e "s/<<build>>/${revision}/g" build/src/chrome/locale/de-DE/ThreadVis.dtd

sed -i -e "s/<<version>>/${version}/g" build/src/chrome/locale/de-DE/ThreadVisAbout.dtd
sed -i -e "s/<<build>>/${revision}/g" build/src/chrome/locale/de-DE/ThreadVisAbout.dtd

sed -i -e "s/<<version>>/${version}/g" build/src/chrome/locale/en-US/Settings.dtd
sed -i -e "s/<<build>>/${revision}/g" build/src/chrome/locale/en-US/Settings.dtd

sed -i -e "s/<<version>>/${version}/g" build/src/chrome/locale/en-US/ThreadVis.dtd
sed -i -e "s/<<build>>/${revision}/g" build/src/chrome/locale/en-US/ThreadVis.dtd

sed -i -e "s/<<version>>/${version}/g" build/src/chrome/locale/en-US/ThreadVisAbout.dtd
sed -i -e "s/<<build>>/${revision}/g" build/src/chrome/locale/en-US/ThreadVisAbout.dtd

sed -i -e "s/<<version>>/${version}/g" build/src/chrome/content/Logger.js
sed -i -e "s/<<build>>/${revision}/g" build/src/chrome/content/Logger.js

sed -i -e "s/<<version>>/${version}/g" build/src/install.js
sed -i -e "s/<<build>>/${revision}/g" build/src/install.js

sed -i -e "s/<<version>>/${version}/g" build/src/install.rdf
sed -i -e "s/<<build>>/${revision}/g" build/src/install.rdf

sed -i -e "s/<<version>>/${version}/g" build/src/update.rdf
sed -i -e "s/<<build>>/${revision}/g" build/src/update.rdf



# ##############################################################################
# Create JAR file
# ##############################################################################

cd build/src/chrome
zip -r threadvis.jar . -i@../../../jar.filelist
cd ../../..



# ##############################################################################
# Create XPI file
# ##############################################################################

cd build/src
zip -r ThreadVis.xpi . -i@../../xpi.filelist
cd ../..
cp build/src/ThreadVis.xpi build/ThreadVis.xpi
cp build/src/update.rdf build/update.rdf


# ##############################################################################
# Create XPI file for addons.mozilla.org
# ##############################################################################

sed -i -e '/<em:updateURL>.*<\/em:updateUrl>/d' build/src/install.rdf
cd build/src
zip -r ThreadVis-addons.mozilla.org.xpi . -i@../../xpi.filelist
cd ../..
cp build/src/ThreadVis-addons.mozilla.org.xpi build/ThreadVis-addons.mozilla.org.xpi



# ##############################################################################
# Clean up build directory
# ##############################################################################
rm -Rf build/src



echo "Build $revision successful."