default:
	for i in $(ls *.less | grep -v _); do lessc $i $(basename $i .less).css; done;
	# For every less file, except _style.less
