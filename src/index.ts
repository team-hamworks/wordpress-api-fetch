import { __ } from '@wordpress/i18n';
import apiFetch, { APIFetchOptions } from '@wordpress/api-fetch';
import { applyFilters } from '@wordpress/hooks';
import fetchAllMiddleware from './middlewares/fetch-all-middleware.js';

import {
	parseResponseAndNormalizeError,
	parseAndThrowError,
} from '@wordpress/api-fetch/src/utils/response';

const DEFAULT_HEADERS = {
	// The backend uses the Accept header as a condition for considering an
	// incoming request as a REST request.
	//
	// See: https://core.trac.wordpress.org/ticket/44534
	Accept: 'application/json, */*;q=0.1',
};

const checkStatus = ( response ) => {
	if ( response.status >= 200 && response.status < 300 ) {
		return response;
	}

	throw response;
};

const fetchHandler = ( nextOptions ) => {
	const filteredOptions = applyFilters< APIFetchOptions >(
		'apiFetchOptions',
		nextOptions
	);
	const {
		url,
		path,
		data,
		parse = true,
		...remainingOptions
	} = filteredOptions;
	let { body, headers } = nextOptions;

	// Merge explicitly-provided headers with default values.
	headers = { ...DEFAULT_HEADERS, ...headers };

	// The `data` property is a shorthand for sending a JSON body.
	if ( data ) {
		body = JSON.stringify( data );
		headers[ 'Content-Type' ] = 'application/json';
	}

	const responsePromise = globalThis.fetch( url || path, {
		...{
			credentials: 'include',
		},
		...remainingOptions,
		body,
		headers,
	} );

	return (
		responsePromise
			// Return early if fetch errors. If fetch error, there is most likely no
			// network connection. Unfortunately fetch just throws a TypeError and
			// the message might depend on the browser.
			.then(
				( value ) =>
					Promise.resolve( value )
						.then( checkStatus )
						.catch( ( response ) =>
							parseAndThrowError( response, parse )
						)
						.then( ( response ) =>
							parseResponseAndNormalizeError( response, parse )
						),
				() => {
					throw {
						code: 'fetch_error',
						message: __( 'You are probably offline.' ),
					};
				}
			)
	);
};
apiFetch.setFetchHandler( fetchHandler );
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
apiFetch.fetchAllInParallelMiddleware = fetchAllMiddleware;
export default apiFetch;
