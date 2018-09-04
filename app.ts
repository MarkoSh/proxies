declare function require( name:string );

let axios 	= require( 'axios' ),
	async 	= require( 'async' ),
	fs		= require( 'fs' ),
	process = require( 'process' ),
	md5		= require( 'md5' ),
	jsdom 	= require( 'jsdom' ),
	{ JSDOM } = jsdom;

let proxies = {},
	proxies_good = [];

let lists = [ {
	cb: ( callback ) => {
		let proxylists = [
			'https://free-proxy-list.net/',
			'https://www.us-proxy.org/',
			'https://free-proxy-list.net/anonymous-proxy.html'
		];
		async.eachOfLimit( proxylists, 3, ( proxylist, i, callback ) => {
			axios( {
				url: proxylist
			} ).then( response => {
				let data = response.data,
					{ document } = ( new JSDOM( data ) ).window,
					dataTable = document.getElementById( 'proxylisttable' ),
					trs = dataTable.querySelectorAll( 'tbody tr' );
				trs.forEach( tr => {
					let tds 	= Array.prototype.slice.call( tr.querySelectorAll( 'td' ) ),
						ip 		= tds[ 0 ].textContent.trim(),
						port 	= tds[ 1 ].textContent.trim(),
						key		= md5( ip );
					if ( ! ( key in proxies ) ) {
						proxies[ key ] = {
							proxy: ip + ':' + port,
							ip: ip,
							port: port,
							rate: 0,
							cd: 0
						};
					}
				} );
				
				callback();
			} ).catch( error => {
				console.log( error );
				callback();
			} );
		}, error => {
			callback();
		} );
	}
} ];

console.log( 'Init' );

let worker = ( restart: boolean = false ) => {
	if ( restart ) console.log( 'Restart' );
	async.eachOfLimit( lists, 5, ( list, i, callback ) => {
		list.cb( callback );
	}, error => {
		console.log( 'Checking' );
		async.eachOfLimit( proxies, 200, ( proxy, i, callback ) => {
			console.log( 'Checking proxy ' + proxy[ 'proxy' ] );
			axios( {
				url: 'http://markschk.ru/',
				timeout: 5000,
				proxy: {
					host: proxy[ 'ip' ],
					port: proxy[ 'port' ]
				}
			} ).then( response => {
				let data = response.data;
				if ( data.includes( 'Mark Shkliaruk' ) ) {
					proxies[ i ][ 'rate' ]++;
				} else {
					proxies[ i ][ 'rate' ]--;
				}
				proxies[ i ][ 'cd' ] = +new Date();
				console.log( 'Checking proxy ' + proxy[ 'proxy' ] + ' done' );
				callback();
			} ).catch( error => {
				proxies[ i ][ 'rate' ] -= 10;
				proxies[ i ][ 'cd' ] = +new Date();
				console.log( error );
				callback();
			} );
		}, error => {
			setTimeout( () => {
				worker( true );
			}, 10000 );
		} );
	} );
};

worker();
