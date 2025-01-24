#!/usr/bin/sh

# sed Commands
pad_cmd="s/^/            /g"
sed_cmd="s/\\([\\$\\.\\*\\[\\\\\\^\\/;\\&]\\)/\\\\\\1/g"

# BRE Selectors
link_regex="<link href=\"styles\\.css\" rel=\"stylesheet\"\\/>"
script_regex="<script src=\"functions\\.js\"><\\/script>"

styles="<style>\t$(sed -e "$pad_cmd" _site/styles.css | tr "\n" "\t" | sed -e "$sed_cmd")\t        <\\/style>"
functions="<script>\t$(sed -e "$pad_cmd" _site/functions.js | tr "\n" "\t" | sed -e "$sed_cmd")\t        <\\/script>"

styles_cmd="s/$link_regex/$styles/g"
functions_cmd="s/$script_regex/$functions/g"

mkdir -p local_version
sed -e "$styles_cmd" _site/index.html > index-temp.html
sed -e "$functions_cmd" index-temp.html | tr "\t" "\n" > local_version/index-full.html
rm index-temp.html
