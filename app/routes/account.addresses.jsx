import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from 'react-router';
import {
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
  CREATE_ADDRESS_MUTATION,
} from '~/graphql/customer-account/CustomerAddressMutations';
import styles from '~/styles/Account.module.css';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Direcciones | Essenze'}];
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  await context.customerAccount.handleAuthStatus();

  return {};
}

/**
 * @param {Route.ActionArgs}
 */
export async function action({request, context}) {
  const {customerAccount} = context;

  try {
    const form = await request.formData();

    const addressId = form.has('addressId')
      ? String(form.get('addressId'))
      : null;
    if (!addressId) {
      throw new Error('You must provide an address id.');
    }

    // this will ensure redirecting to login never happen for mutatation
    const isLoggedIn = await customerAccount.isLoggedIn();
    if (!isLoggedIn) {
      return data(
        {error: {[addressId]: 'Unauthorized'}},
        {
          status: 401,
        },
      );
    }

    const defaultAddress = form.has('defaultAddress')
      ? String(form.get('defaultAddress')) === 'on'
      : false;
    const address = {};
    const keys = [
      'address1',
      'address2',
      'city',
      'company',
      'territoryCode',
      'firstName',
      'lastName',
      'phoneNumber',
      'zoneCode',
      'zip',
    ];

    for (const key of keys) {
      const value = form.get(key);
      if (typeof value === 'string') {
        address[key] = value;
      }
    }

    switch (request.method) {
      case 'POST': {
        // handle new address creation
        try {
          const {data, errors} = await customerAccount.mutate(
            CREATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressCreate?.userErrors?.length) {
            throw new Error(data?.customerAddressCreate?.userErrors[0].message);
          }

          if (!data?.customerAddressCreate?.customerAddress) {
            throw new Error('Customer address create failed.');
          }

          return {
            error: null,
            createdAddress: data?.customerAddressCreate?.customerAddress,
            defaultAddress,
          };
        } catch (error) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'PUT': {
        // handle address updates
        try {
          const {data, errors} = await customerAccount.mutate(
            UPDATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                addressId: decodeURIComponent(addressId),
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressUpdate?.userErrors?.length) {
            throw new Error(data?.customerAddressUpdate?.userErrors[0].message);
          }

          if (!data?.customerAddressUpdate?.customerAddress) {
            throw new Error('Customer address update failed.');
          }

          return {
            error: null,
            updatedAddress: address,
            defaultAddress,
          };
        } catch (error) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'DELETE': {
        // handles address deletion
        try {
          const {data, errors} = await customerAccount.mutate(
            DELETE_ADDRESS_MUTATION,
            {
              variables: {
                addressId: decodeURIComponent(addressId),
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressDelete?.userErrors?.length) {
            throw new Error(data?.customerAddressDelete?.userErrors[0].message);
          }

          if (!data?.customerAddressDelete?.deletedAddressId) {
            throw new Error('Customer address delete failed.');
          }

          return {error: null, deletedAddress: addressId};
        } catch (error) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      default: {
        return data(
          {error: {[addressId]: 'Method not allowed'}},
          {
            status: 405,
          },
        );
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      return data(
        {error: error.message},
        {
          status: 400,
        },
      );
    }
    return data(
      {error},
      {
        status: 400,
      },
    );
  }
}

export default function Addresses() {
  const {customer} = useOutletContext();
  const {defaultAddress, addresses} = customer;
  return (
    <section>
      <div className={styles.sectionHeading}>
        <div><p className={styles.eyebrow}>Entrega</p><h2>Mis direcciones</h2></div>
        <p>Guarda las direcciones que utilizas con mayor frecuencia para agilizar tus próximas compras.</p>
      </div>
      <div className={styles.addressGrid}>
        <div className={styles.addressCard}><h3>Nueva dirección</h3><NewAddressForm key={addresses.nodes.length} /></div>
        {addresses.nodes.map((address) => (
          <div className={styles.addressCard} key={address.id}>
            <h3>{defaultAddress?.id === address.id ? 'Dirección principal' : 'Dirección guardada'}</h3>
            <AddressForm addressId={address.id} address={address} defaultAddress={defaultAddress}>
              {({stateForMethod}) => (
                <div className={styles.actions}>
                  <button disabled={stateForMethod('PUT') !== 'idle'} formMethod="PUT" type="submit">{stateForMethod('PUT') !== 'idle' ? 'Guardando…' : 'Guardar'}</button>
                  <button className={styles.dangerButton} disabled={stateForMethod('DELETE') !== 'idle'} formMethod="DELETE" type="submit">{stateForMethod('DELETE') !== 'idle' ? 'Eliminando…' : 'Eliminar'}</button>
                </div>
              )}
            </AddressForm>
          </div>
        ))}
      </div>
      {!addresses.nodes.length ? <div className={styles.empty}><p>Aún no tienes direcciones guardadas.</p></div> : null}
    </section>
  );
}

function NewAddressForm() {
  const newAddress = {address1:'',address2:'',city:'',company:'',territoryCode:'MX',firstName:'',id:'new',lastName:'',phoneNumber:'',zoneCode:'',zip:''};
  return (
    <AddressForm addressId="NEW_ADDRESS_ID" address={newAddress} defaultAddress={null}>
      {({stateForMethod}) => <div className={styles.actions}><button disabled={stateForMethod('POST') !== 'idle'} formMethod="POST" type="submit">{stateForMethod('POST') !== 'idle' ? 'Creando…' : 'Guardar dirección'}</button></div>}
    </AddressForm>
  );
}

export function AddressForm({addressId, address, defaultAddress, children}) {
  const {state, formMethod} = useNavigation();
  const action = useActionData();
  const error = action?.error?.[addressId];
  const isDefaultAddress = defaultAddress?.id === addressId;
  const suffix = String(addressId).replace(/[^a-zA-Z0-9]/g, '').slice(-12) || 'address';
  const field = (name) => `${name}-${suffix}`;
  return (
    <Form id={`address-${suffix}`} className={styles.form}>
      <fieldset>
        <input type="hidden" name="addressId" defaultValue={addressId} />
        <label htmlFor={field('firstName')}>Nombre*<input autoComplete="given-name" defaultValue={address?.firstName ?? ''} id={field('firstName')} name="firstName" placeholder="Nombre" required type="text" /></label>
        <label htmlFor={field('lastName')}>Apellido*<input autoComplete="family-name" defaultValue={address?.lastName ?? ''} id={field('lastName')} name="lastName" placeholder="Apellido" required type="text" /></label>
        <label htmlFor={field('company')}>Empresa<input autoComplete="organization" defaultValue={address?.company ?? ''} id={field('company')} name="company" placeholder="Opcional" type="text" /></label>
        <label htmlFor={field('phoneNumber')}>Teléfono<input autoComplete="tel" defaultValue={address?.phoneNumber ?? ''} id={field('phoneNumber')} name="phoneNumber" placeholder="+52…" pattern="^\+?[1-9]\d{3,14}$" type="tel" /></label>
        <label htmlFor={field('address1')}>Calle y número*<input autoComplete="address-line1" defaultValue={address?.address1 ?? ''} id={field('address1')} name="address1" placeholder="Calle, número exterior" required type="text" /></label>
        <label htmlFor={field('address2')}>Interior / referencia<input autoComplete="address-line2" defaultValue={address?.address2 ?? ''} id={field('address2')} name="address2" placeholder="Opcional" type="text" /></label>
        <label htmlFor={field('city')}>Ciudad*<input autoComplete="address-level2" defaultValue={address?.city ?? ''} id={field('city')} name="city" placeholder="Ciudad" required type="text" /></label>
        <label htmlFor={field('zoneCode')}>Estado*<input autoComplete="address-level1" defaultValue={address?.zoneCode ?? ''} id={field('zoneCode')} name="zoneCode" placeholder="Estado" required type="text" /></label>
        <label htmlFor={field('zip')}>Código postal*<input autoComplete="postal-code" defaultValue={address?.zip ?? ''} id={field('zip')} name="zip" placeholder="C.P." required type="text" /></label>
        <label htmlFor={field('territoryCode')}>País*<input autoComplete="country" defaultValue={address?.territoryCode ?? 'MX'} id={field('territoryCode')} name="territoryCode" placeholder="MX" required type="text" maxLength={2} /></label>
        <label className={styles.checkbox} htmlFor={field('defaultAddress')}><input defaultChecked={isDefaultAddress} id={field('defaultAddress')} name="defaultAddress" type="checkbox" /> Usar como dirección principal</label>
        {error ? <p className={styles.message}>{error}</p> : null}
        {children({stateForMethod:(method)=>(formMethod===method?state:'idle')})}
      </fieldset>
    </Form>
  );
}

/**
 * @typedef {{
 *   addressId?: string | null;
 *   createdAddress?: AddressFragment;
 *   defaultAddress?: string | null;
 *   deletedAddress?: string | null;
 *   error: Record<AddressFragment['id'], string> | null;
 *   updatedAddress?: AddressFragment;
 * }} ActionResponse
 */

/** @typedef {import('@shopify/hydrogen/customer-account-api-types').CustomerAddressInput} CustomerAddressInput */
/** @typedef {import('customer-accountapi.generated').AddressFragment} AddressFragment */
/** @typedef {import('customer-accountapi.generated').CustomerFragment} CustomerFragment */
/** @template T @typedef {import('react-router').Fetcher<T>} Fetcher */
/** @typedef {import('./+types/account.addresses').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
/** @typedef {ReturnType<typeof useActionData<typeof action>>} ActionReturnData */
